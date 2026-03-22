import type { InferSelectModel } from "drizzle-orm";
import type { criteria as criteriaTable, icps as icpsTable } from "@/db/schema";
import {
  resolveValue,
  matchesNumericRange,
  NUMERIC_FIELDS,
  TEXT_FIELDS,
  normalizeValue,
  type MatchType,
} from "@/lib/scoring/normalize";

type Criterion = InferSelectModel<typeof criteriaTable>;
type Icp = InferSelectModel<typeof icpsTable>;

export type MatchReason = {
  category: string;
  criterionValue: string;
  intent: string;
  matched: boolean;
  matchType: MatchType;
  weight: number | null;
  leadValue: string | null;
  resolvedLeadValue?: string;
};

export type ScoringResult = {
  bestIcpId: string | null;
  bestIcpName: string | null;
  fitScore: number; // 0-100
  confidence: number; // 0-100
  fitLevel: "high" | "medium" | "low" | "risk" | "blocked" | "none";
  matchReasons: MatchReason[];
  blockers: string[]; // list of exclude criteria that matched
  riskFlags: string[]; // list of risk criteria that matched
  matchedCount: number;
  totalCriteria: number;
  fieldsPresent: number;
  fieldsTotal: number;
};

type MappedLead = Record<string, string | undefined>;

export const MAPPABLE_FIELDS = [
  { key: "company_name", label: "Company Name" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "region", label: "Region" },
  { key: "company_size", label: "Company Size" },
  { key: "business_model", label: "Business Model" },
  { key: "platform", label: "Platform" },
  { key: "payment_method", label: "Payment Method" },
  { key: "tech_stack", label: "Tech Stack" },
  { key: "website", label: "Website" },
  { key: "contact_name", label: "Contact Name" },
  { key: "contact_email", label: "Contact Email" },
  { key: "contact_title", label: "Contact Title" },
] as const;

function matchesCriterion(
  criterion: Criterion,
  lead: MappedLead,
  icpValues: string[],
  workspaceMemory: Record<string, string>,
  aiMappings: Record<string, string>,
): { matched: boolean; matchType: MatchType; resolvedValue?: string } {
  const rawLeadValue = lead[criterion.category];
  if (!rawLeadValue) return { matched: false, matchType: "none" };

  // Numeric range matching
  if (NUMERIC_FIELDS.has(criterion.category)) {
    const matched = matchesNumericRange(criterion.value, rawLeadValue);
    return {
      matched,
      matchType: matched ? "exact" : "none",
      resolvedValue: rawLeadValue,
    };
  }

  // Resolve value through normalization pipeline
  const { resolved, matchType } = resolveValue(
    rawLeadValue,
    criterion.category,
    icpValues,
    workspaceMemory,
    aiMappings,
  );

  // Text/contains matching
  if (TEXT_FIELDS.has(criterion.category) || criterion.operator === "contains") {
    const criterionValues = criterion.value
      .split(",")
      .map((v) => normalizeValue(v).toLowerCase());
    const resolvedLower = resolved.toLowerCase();
    const matched = criterionValues.some((cv) => resolvedLower.includes(cv));
    return {
      matched,
      matchType: matched ? matchType : "none",
      resolvedValue: resolved,
    };
  }

  // Exact matching (with resolved value)
  const criterionValues = criterion.value
    .split(",")
    .map((v) => normalizeValue(v).toLowerCase());
  const resolvedLower = resolved.toLowerCase();
  const matched = criterionValues.some((cv) => cv === resolvedLower);
  return {
    matched,
    matchType: matched ? matchType : "none",
    resolvedValue: resolved,
  };
}

export function scoreLeadAgainstIcp(
  lead: MappedLead,
  icp: Icp,
  icpCriteria: Criterion[],
  workspaceMemory: Record<string, Record<string, string>>,
  aiMappings: Record<string, Record<string, string>>,
): ScoringResult {
  const reasons: MatchReason[] = [];
  const blockers: string[] = [];
  const riskFlags: string[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;
  let matchedCount = 0;
  let exactOrSynonymCount = 0;
  let totalMatches = 0;

  // Collect ICP values per category for resolution
  const icpValuesByCategory: Record<string, string[]> = {};
  for (const c of icpCriteria) {
    if (!icpValuesByCategory[c.category])
      icpValuesByCategory[c.category] = [];
    c.value.split(",").forEach((v) => {
      const trimmed = v.trim();
      if (trimmed) icpValuesByCategory[c.category].push(trimmed);
    });
  }

  // Count fields present in lead
  const relevantCategories = new Set(icpCriteria.map((c) => c.category));
  const fieldsPresent = Array.from(relevantCategories).filter(
    (cat) => lead[cat]?.trim(),
  ).length;
  const fieldsTotal = relevantCategories.size;

  // Phase A: Check hard blockers first
  const excludeCriteria = icpCriteria.filter((c) => c.intent === "exclude");
  for (const criterion of excludeCriteria) {
    const catMemory = workspaceMemory[criterion.category] ?? {};
    const catAi = aiMappings[criterion.category] ?? {};
    const { matched, matchType, resolvedValue } = matchesCriterion(
      criterion,
      lead,
      icpValuesByCategory[criterion.category] ?? [],
      catMemory,
      catAi,
    );

    reasons.push({
      category: criterion.category,
      criterionValue: criterion.value,
      intent: criterion.intent,
      matched,
      matchType,
      weight: criterion.weight,
      leadValue: lead[criterion.category] ?? null,
      resolvedLeadValue: resolvedValue,
    });

    if (matched) {
      const severity = criterion.weight ?? 5;
      if (severity >= 7) {
        blockers.push(`${criterion.category} = ${lead[criterion.category]}`);
      }
    }
  }

  // If hard blockers found, return blocked
  if (blockers.length > 0) {
    return {
      bestIcpId: icp.id,
      bestIcpName: icp.name,
      fitScore: 0,
      confidence:
        fieldsTotal > 0
          ? Math.round((fieldsPresent / fieldsTotal) * 100)
          : 0,
      fitLevel: "blocked",
      matchReasons: reasons,
      blockers,
      riskFlags: [],
      matchedCount: 0,
      totalCriteria: icpCriteria.length,
      fieldsPresent,
      fieldsTotal,
    };
  }

  // Phase B: Score qualify criteria
  const qualifyCriteria = icpCriteria.filter((c) => c.intent === "qualify");
  for (const criterion of qualifyCriteria) {
    const weight = criterion.weight ?? 5;
    const catMemory = workspaceMemory[criterion.category] ?? {};
    const catAi = aiMappings[criterion.category] ?? {};
    const { matched, matchType, resolvedValue } = matchesCriterion(
      criterion,
      lead,
      icpValuesByCategory[criterion.category] ?? [],
      catMemory,
      catAi,
    );

    reasons.push({
      category: criterion.category,
      criterionValue: criterion.value,
      intent: criterion.intent,
      matched,
      matchType,
      weight,
      leadValue: lead[criterion.category] ?? null,
      resolvedLeadValue: resolvedValue,
    });

    totalWeight += weight;
    if (matched) {
      matchedWeight += weight;
      matchedCount++;
      totalMatches++;
      if (
        matchType === "exact" ||
        matchType === "case_insensitive" ||
        matchType === "synonym"
      ) {
        exactOrSynonymCount++;
      }
    }
  }

  // Phase C: Check risk criteria
  const riskCriteria = icpCriteria.filter((c) => c.intent === "risk");
  for (const criterion of riskCriteria) {
    const catMemory = workspaceMemory[criterion.category] ?? {};
    const catAi = aiMappings[criterion.category] ?? {};
    const { matched, matchType, resolvedValue } = matchesCriterion(
      criterion,
      lead,
      icpValuesByCategory[criterion.category] ?? [],
      catMemory,
      catAi,
    );

    reasons.push({
      category: criterion.category,
      criterionValue: criterion.value,
      intent: criterion.intent,
      matched,
      matchType,
      weight: criterion.weight,
      leadValue: lead[criterion.category] ?? null,
      resolvedLeadValue: resolvedValue,
    });

    if (matched) {
      riskFlags.push(`${criterion.category} = ${lead[criterion.category]}`);
    }
  }

  // Calculate fit score
  const baseScore =
    totalWeight > 0
      ? Math.round((matchedWeight / totalWeight) * 100)
      : 0;
  const riskPenalty = riskFlags.length * 10;
  const fitScore = Math.max(0, baseScore - riskPenalty);

  // Calculate confidence
  const dataCompleteness =
    fieldsTotal > 0 ? fieldsPresent / fieldsTotal : 0;
  const matchQuality =
    totalMatches > 0 ? exactOrSynonymCount / totalMatches : 0;
  const confidence = Math.round(
    (dataCompleteness * 0.6 + matchQuality * 0.4) * 100,
  );

  // Determine fit level
  let fitLevel: ScoringResult["fitLevel"];
  if (riskFlags.length > 0 && fitScore < 50) fitLevel = "risk";
  else if (fitScore >= 70) fitLevel = "high";
  else if (fitScore >= 40) fitLevel = "medium";
  else if (fitScore > 0) fitLevel = "low";
  else fitLevel = "none";

  return {
    bestIcpId: icp.id,
    bestIcpName: icp.name,
    fitScore,
    confidence,
    fitLevel,
    matchReasons: reasons,
    blockers,
    riskFlags,
    matchedCount,
    totalCriteria: icpCriteria.length,
    fieldsPresent,
    fieldsTotal,
  };
}

export function scoreLeadAgainstAllIcps(
  lead: MappedLead,
  icps: Array<{ icp: Icp; criteria: Criterion[] }>,
  workspaceMemory: Record<string, Record<string, string>>,
  aiMappings: Record<string, Record<string, string>>,
): ScoringResult {
  let bestResult: ScoringResult | null = null;

  for (const { icp, criteria } of icps) {
    if (icp.status !== "active") continue;
    const result = scoreLeadAgainstIcp(
      lead,
      icp,
      criteria,
      workspaceMemory,
      aiMappings,
    );

    if (!bestResult || result.fitScore > bestResult.fitScore) {
      bestResult = result;
    }
  }

  if (!bestResult) {
    return {
      bestIcpId: null,
      bestIcpName: null,
      fitScore: 0,
      confidence: 0,
      fitLevel: "none",
      matchReasons: [],
      blockers: [],
      riskFlags: [],
      matchedCount: 0,
      totalCriteria: 0,
      fieldsPresent: 0,
      fieldsTotal: 0,
    };
  }

  return bestResult;
}
