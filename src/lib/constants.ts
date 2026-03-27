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

export const EXCLUSIONS_DESCRIPTION =
  "Hard disqualifiers. If any of these match, the company is not your ICP — even if everything else fits.";

export const RISK_DESCRIPTION =
  "Borderline factors that need case-by-case evaluation. Not a hard exclusion, but requires attention.";

export const EXCLUSION_EMPTY_SUGGESTIONS = [
  "Restricted jurisdictions",
  "Unsupported business models",
  "Compliance blockers",
];

export const RISK_EMPTY_SUGGESTIONS = [
  "Region with licensing restrictions",
  "Industry with regulatory uncertainty",
  "Company size at edge of capacity",
];

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
  { label: "Keywords", category: "keyword", group: "keyword" },
];

// ─── Tiered picker groups for the modal ─────────────────────────────────────

export const PICKER_TIERS: Array<{
  tier: "core" | "additional" | "advanced";
  label: string;
  description: string;
  properties: Array<{ label: string; category: string; group: string }>;
}> = [
  {
    tier: "core",
    label: "Core",
    description: "Define who your ideal customer is",
    properties: [
      { label: "Industry", category: "industry", group: "firmographic" },
      { label: "Region", category: "region", group: "firmographic" },
      { label: "Company size", category: "company_size", group: "firmographic" },
      { label: "Business model", category: "business_model", group: "firmographic" },
    ],
  },
  {
    tier: "additional",
    label: "Additional",
    description: "Other ways to describe your ICP",
    properties: [
      { label: "Platform", category: "platform", group: "technographic" },
      { label: "Payment method", category: "payment_method", group: "technographic" },
      { label: "Tech stack", category: "tech_stack", group: "technographic" },
      { label: "Growth stage", category: "growth_stage", group: "behavioral" },
      { label: "Hiring activity", category: "hiring_activity", group: "behavioral" },
      { label: "Keywords", category: "keyword", group: "keyword" },
    ],
  },
  {
    tier: "advanced",
    label: "Advanced",
    description: "For regulated products or industries",
    properties: [
      { label: "Regulatory status", category: "regulatory_status", group: "compliance" },
      { label: "License type", category: "license_type", group: "compliance" },
      { label: "Jurisdiction", category: "jurisdiction", group: "compliance" },
    ],
  },
];

// Core criteria categories — used for ICP strength tracking
export const CORE_CRITERIA_CATEGORIES = ["industry", "region", "company_size", "business_model"];

// Additional criteria DB groups
export const ADDITIONAL_GROUPS = ["technographic", "behavioral", "keyword"];

// Advanced criteria DB groups
export const ADVANCED_GROUPS = ["compliance"];

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
