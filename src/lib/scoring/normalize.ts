import { resolveIndustry } from "@/lib/taxonomy/lookup";

// Re-export normalizeValue from the extracted module (avoids circular imports)
export { normalizeValue } from "./normalize-value";
import { normalizeValue } from "./normalize-value";

// ─── Canonical synonym dictionaries ─────────────────────────────────────────

const COUNTRY_SYNONYMS: Record<string, string> = {
  us: "US",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  america: "US",
  uk: "UK",
  gb: "UK",
  "great britain": "UK",
  "united kingdom": "UK",
  england: "UK",
  de: "Germany",
  deutschland: "Germany",
  fr: "France",
  nl: "Netherlands",
  holland: "Netherlands",
  ae: "UAE",
  "united arab emirates": "UAE",
  sg: "Singapore",
  hk: "Hong Kong",
  "hong kong sar": "Hong Kong",
  eu: "EU",
  europe: "EU",
  "european union": "EU",
};

const PLATFORM_SYNONYMS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  "woo commerce": "WooCommerce",
  woo: "WooCommerce",
  magento: "Magento",
  bigcommerce: "BigCommerce",
  stripe: "Stripe",
  paypal: "PayPal",
  adyen: "Adyen",
};

const TITLE_SYNONYMS: Record<string, string> = {
  ceo: "CEO",
  "chief executive officer": "CEO",
  cto: "CTO",
  "chief technology officer": "CTO",
  cfo: "CFO",
  "chief financial officer": "CFO",
  coo: "COO",
  "chief operating officer": "COO",
  "vp eng": "VP of Engineering",
  "vp engineering": "VP of Engineering",
  "vp payments": "Head of Payments",
  "head of payments": "Head of Payments",
  "head of product": "Head of Product",
};

// Get synonym dictionary for a category (industry handled by taxonomy)
function getSynonyms(category: string): Record<string, string> {
  switch (category) {
    case "country":
    case "region":
      return COUNTRY_SYNONYMS;
    case "platform":
    case "tech_stack":
    case "payment_method":
      return PLATFORM_SYNONYMS;
    case "contact_title":
      return TITLE_SYNONYMS;
    default:
      return {};
  }
}

export type MatchType =
  | "exact"
  | "case_insensitive"
  | "taxonomy"
  | "taxonomy_parent"
  | "synonym"
  | "workspace_memory"
  | "ai_mapped"
  | "none";

export function resolveValue(
  rawValue: string,
  category: string,
  icpValues: string[],
  workspaceMemory: Record<string, string> = {},
  aiMappings: Record<string, string> = {},
): { resolved: string; matchType: MatchType } {
  const normalized = normalizeValue(rawValue);
  const lower = normalized.toLowerCase();

  // 1. Exact match
  const exactMatch = icpValues.find((v) => v === normalized);
  if (exactMatch) return { resolved: exactMatch, matchType: "exact" };

  // 2. Case-insensitive match
  const caseMatch = icpValues.find((v) => v.toLowerCase() === lower);
  if (caseMatch) return { resolved: caseMatch, matchType: "case_insensitive" };

  // 3. Taxonomy resolve (industry category only)
  if (category === "industry") {
    const node = resolveIndustry(rawValue);
    if (node) {
      const inIcp = icpValues.find(
        (v) => v.toLowerCase() === node.name.toLowerCase(),
      );
      if (inIcp) return { resolved: inIcp, matchType: "taxonomy" };
      return { resolved: node.name, matchType: "taxonomy" };
    }
  }

  // 4. Built-in synonym match (non-industry categories)
  const synonyms = getSynonyms(category);
  const synonymMatch = synonyms[lower];
  if (synonymMatch) {
    const inIcp = icpValues.find(
      (v) => v.toLowerCase() === synonymMatch.toLowerCase(),
    );
    if (inIcp) return { resolved: inIcp, matchType: "synonym" };
    return { resolved: synonymMatch, matchType: "synonym" };
  }

  // 5. Workspace memory
  const memoryMatch = workspaceMemory[lower] || workspaceMemory[normalized];
  if (memoryMatch)
    return { resolved: memoryMatch, matchType: "workspace_memory" };

  // 6. AI mapping
  const aiMatch = aiMappings[rawValue] || aiMappings[normalized];
  if (aiMatch && aiMatch !== "NONE")
    return { resolved: aiMatch, matchType: "ai_mapped" };

  // 7. No match
  return { resolved: normalized, matchType: "none" };
}

// Parse numeric ranges from strings like "50-200", ">100", "100+"
export function parseNumericRange(
  value: string,
): { min?: number; max?: number } | null {
  const cleaned = value.replace(/[,\s]/g, "");

  // "50-200" or "50 - 200"
  const rangeMatch = cleaned.match(/^(\d+)\s*[-\u2013]\s*(\d+)$/);
  if (rangeMatch)
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };

  // ">100" or "100+"
  const gtMatch = cleaned.match(/^[>]?\s*(\d+)\+?$/);
  if (gtMatch && (cleaned.startsWith(">") || cleaned.endsWith("+")))
    return { min: parseInt(gtMatch[1]) };

  // "<100"
  const ltMatch = cleaned.match(/^[<]\s*(\d+)$/);
  if (ltMatch) return { max: parseInt(ltMatch[1]) };

  // Plain number
  const numMatch = cleaned.match(/^(\d+)$/);
  if (numMatch)
    return { min: parseInt(numMatch[1]), max: parseInt(numMatch[1]) };

  return null;
}

export function matchesNumericRange(
  criterionValue: string,
  leadValue: string,
): boolean {
  const criterionRange = parseNumericRange(criterionValue);
  const leadNum = parseNumericRange(leadValue);

  if (!criterionRange || !leadNum) return false;

  const leadPoint = leadNum.min ?? leadNum.max ?? 0;

  if (
    criterionRange.min !== undefined &&
    criterionRange.max !== undefined
  ) {
    return (
      leadPoint >= criterionRange.min && leadPoint <= criterionRange.max
    );
  }
  if (criterionRange.min !== undefined) {
    return leadPoint >= criterionRange.min;
  }
  if (criterionRange.max !== undefined) {
    return leadPoint <= criterionRange.max;
  }
  return false;
}

// Fields that should use numeric range matching
export const NUMERIC_FIELDS = new Set([
  "company_size",
  "revenue",
  "employee_count",
  "headcount",
]);

// Fields that should use contains/token matching
export const TEXT_FIELDS = new Set([
  "keyword",
  "tech_stack",
  "description",
  "notes",
]);
