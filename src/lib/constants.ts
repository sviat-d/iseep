// Display labels for criteria group enum values
// DB values stay: firmographic, technographic, behavioral, compliance, keyword
export const GROUP_LABELS: Record<string, string> = {
  firmographic: "Company basics",
  technographic: "Tech & product",
  behavioral: "Growth & activity",
  compliance: "Compliance & regulation",
  keyword: "Keywords & custom",
};

export const GROUP_DESCRIPTIONS: Record<string, string> = {
  firmographic: "Core attributes of your ideal customer — industry, size, geography, business model.",
  technographic: "What tools, platforms, or infrastructure they use.",
  behavioral: "Signals of maturity, momentum, and market activity.",
  compliance: "Important for regulated products or industries.",
  keyword: "Additional context and business-specific nuances.",
};

export const OPERATOR_LABELS: Record<string, string> = {
  equals: "equals — exact match",
  contains: "contains — includes this text",
  gt: "greater than",
  lt: "less than",
  in: "one of — comma-separated values",
  not_in: "none of — comma-separated values",
};

export const CONDITION_LABELS: Record<string, string> = {
  equals: "is",
  contains: "contains",
};

// Predefined properties with auto-mapped group
export const PROPERTY_OPTIONS: Array<{
  label: string;
  category: string;
  group: string;
}> = [
  { label: "Industry", category: "industry", group: "firmographic" },
  { label: "Region", category: "region", group: "firmographic" },
  { label: "Company size", category: "company_size", group: "firmographic" },
  { label: "Business model", category: "business_model", group: "firmographic" },
  { label: "Platform", category: "platform", group: "technographic" },
  { label: "Payment method", category: "payment_method", group: "technographic" },
  { label: "Tech stack", category: "tech_stack", group: "technographic" },
  { label: "Growth stage", category: "growth_stage", group: "behavioral" },
  { label: "Hiring activity", category: "hiring_activity", group: "behavioral" },
  { label: "Regulatory status", category: "regulatory_status", group: "compliance" },
  { label: "License type", category: "license_type", group: "compliance" },
  { label: "Jurisdiction", category: "jurisdiction", group: "compliance" },
  { label: "Revenue range", category: "revenue_range", group: "firmographic" },
  { label: "Funding stage", category: "funding_stage", group: "behavioral" },
  { label: "Geo complexity", category: "geo_complexity", group: "firmographic" },
  { label: "Keywords", category: "keyword", group: "keyword" },
];

// ─── Guided picker groups for the add signal modal ──────────────────────────

export const PICKER_TIERS: Array<{
  tier: string;
  label: string;
  properties: Array<{ label: string; category: string; group: string }>;
}> = [
  {
    tier: "basics",
    label: "Basics",
    properties: [
      { label: "Industry", category: "industry", group: "firmographic" },
      { label: "Region", category: "region", group: "firmographic" },
      { label: "Company size", category: "company_size", group: "firmographic" },
      { label: "Business model", category: "business_model", group: "firmographic" },
    ],
  },
  {
    tier: "details",
    label: "Additional",
    properties: [
      { label: "Platform", category: "platform", group: "technographic" },
      { label: "Payment method", category: "payment_method", group: "technographic" },
      { label: "Tech stack", category: "tech_stack", group: "technographic" },
      { label: "Growth stage", category: "growth_stage", group: "behavioral" },
      { label: "Hiring activity", category: "hiring_activity", group: "behavioral" },
      { label: "Funding stage", category: "funding_stage", group: "behavioral" },
      { label: "Revenue range", category: "revenue_range", group: "firmographic" },
      { label: "Geo complexity", category: "geo_complexity", group: "firmographic" },
      { label: "Keywords", category: "keyword", group: "keyword" },
    ],
  },
  {
    tier: "advanced",
    label: "Advanced (optional)",
    properties: [
      { label: "Regulatory status", category: "regulatory_status", group: "compliance" },
      { label: "License type", category: "license_type", group: "compliance" },
      { label: "Jurisdiction", category: "jurisdiction", group: "compliance" },
    ],
  },
];

// ─── Signal strength ─────────────────────────────────────────────────────────

export const SIGNAL_STRENGTHS = [
  { key: "strong", label: "Strong", description: "Very important", weight: 9 },
  { key: "medium", label: "Medium", description: "", weight: 5 },
  { key: "weak", label: "Weak", description: "Nice to have", weight: 2 },
] as const;

export function weightToStrength(weight: number | null): "strong" | "medium" | "weak" {
  if (weight == null) return "medium";
  if (weight >= 8) return "strong";
  if (weight >= 4) return "medium";
  return "weak";
}

export function strengthToWeight(strength: string): number {
  const found = SIGNAL_STRENGTHS.find((s) => s.key === strength);
  return found?.weight ?? 5;
}

// Key basics for completeness tracking
export const KEY_BASICS = ["industry", "region", "company_size", "business_model"];
export const KEY_BASICS_LABELS: Record<string, string> = {
  industry: "Industry",
  region: "Region",
  company_size: "Company size",
  business_model: "Business model",
};

// Business model preset options for multi-select
export const BUSINESS_MODEL_PRESETS = [
  "B2B",
  "B2C",
  "B2B2C",
  "Marketplace",
  "SaaS",
  "Services / Agency",
  "E-commerce",
  "Platform / Network",
  "Subscription-based",
  "Transaction-based",
  "Usage-based",
  "Affiliate / Revshare",
];
