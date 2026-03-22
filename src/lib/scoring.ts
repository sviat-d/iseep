import type { InferSelectModel } from "drizzle-orm";
import type { criteria as criteriaTable, icps as icpsTable } from "@/db/schema";

type Criterion = InferSelectModel<typeof criteriaTable>;
type Icp = InferSelectModel<typeof icpsTable>;

export type MatchReason = {
  category: string;
  value: string;
  intent: string;
  matched: boolean;
  weight: number | null;
  leadValue: string | null;
};

export type ScoringResult = {
  bestIcpId: string | null;
  bestIcpName: string | null;
  fitScore: number; // 0-100
  fitLevel: "high" | "medium" | "low" | "none";
  matchReasons: MatchReason[];
};

type MappedLead = {
  industry?: string;
  country?: string;
  region?: string;
  company_size?: string;
  business_model?: string;
  platform?: string;
  payment_method?: string;
  tech_stack?: string;
  [key: string]: string | undefined;
};

function normalizeValue(v: string): string {
  return v.trim().toLowerCase();
}

function matchesCriterion(criterion: Criterion, lead: MappedLead): boolean {
  const leadValue = lead[criterion.category];
  if (!leadValue) return false;

  const criterionValues = criterion.value.split(",").map((v) => normalizeValue(v));
  const normalizedLead = normalizeValue(leadValue);

  if (criterion.operator === "contains") {
    return criterionValues.some((cv) => normalizedLead.includes(cv));
  }
  // Default: equals (case-insensitive)
  return criterionValues.some((cv) => cv === normalizedLead);
}

export function scoreLeadAgainstIcp(
  lead: MappedLead,
  icp: Icp,
  icpCriteria: Criterion[]
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;
  let hasExcludeMatch = false;
  let hasRiskMatch = false;

  for (const criterion of icpCriteria) {
    const matched = matchesCriterion(criterion, lead);
    const weight = criterion.weight ?? 5;

    reasons.push({
      category: criterion.category,
      value: criterion.value,
      intent: criterion.intent,
      matched,
      weight: criterion.weight,
      leadValue: lead[criterion.category] ?? null,
    });

    if (criterion.intent === "qualify") {
      totalWeight += weight;
      if (matched) matchedWeight += weight;
    } else if (criterion.intent === "exclude" && matched) {
      hasExcludeMatch = true;
    } else if (criterion.intent === "risk" && matched) {
      hasRiskMatch = true;
    }
  }

  // If excluded, score is 0
  if (hasExcludeMatch) return { score: 0, reasons };

  // Calculate base score as percentage of matched weight
  const baseScore = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

  // Penalize for risk matches
  const score = hasRiskMatch ? Math.max(0, baseScore - 15) : baseScore;

  return { score, reasons };
}

export function scoreLeadAgainstAllIcps(
  lead: MappedLead,
  icps: Array<{ icp: Icp; criteria: Criterion[] }>
): ScoringResult {
  let bestScore = 0;
  let bestIcpId: string | null = null;
  let bestIcpName: string | null = null;
  let bestReasons: MatchReason[] = [];

  for (const { icp, criteria } of icps) {
    if (icp.status !== "active") continue;
    const { score, reasons } = scoreLeadAgainstIcp(lead, icp, criteria);
    if (score > bestScore) {
      bestScore = score;
      bestIcpId = icp.id;
      bestIcpName = icp.name;
      bestReasons = reasons;
    }
  }

  let fitLevel: "high" | "medium" | "low" | "none";
  if (bestScore >= 70) fitLevel = "high";
  else if (bestScore >= 40) fitLevel = "medium";
  else if (bestScore > 0) fitLevel = "low";
  else fitLevel = "none";

  return {
    bestIcpId,
    bestIcpName,
    fitScore: bestScore,
    fitLevel,
    matchReasons: bestReasons,
  };
}

// Standard fields that can be mapped from CSV columns
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
