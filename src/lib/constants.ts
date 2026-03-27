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

export const GROUP_EMPTY_SUGGESTIONS: Record<string, string[]> = {
  firmographic: [
    "Industry (e.g. FinTech, E-commerce)",
    "Region (e.g. EU, US, APAC)",
    "Company size (e.g. 50-500 employees)",
    "Business model (e.g. Marketplace, SaaS)",
  ],
  technographic: [
    "Platform (e.g. Shopify, WooCommerce)",
    "Tech stack (e.g. crypto payments, PSP)",
    "Payment method (e.g. cards, crypto, wire transfer)",
  ],
  behavioral: [
    "Growth stage (e.g. Series A-C)",
    "Hiring activity (e.g. hiring payments team)",
  ],
  compliance: [
    "Regulatory status (e.g. PCI DSS certified)",
    "License type (e.g. EMI, PI)",
    "Jurisdiction (e.g. EU-regulated)",
  ],
  keyword: [
    "Industry terms (e.g. cross-border payments)",
    "Product-related (e.g. crypto gateway)",
    "Market segment (e.g. B2B SaaS)",
  ],
};

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

// Simplified condition labels for the rule builder
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

// Grouped property options for the criterion picker
export const PROPERTY_GROUPS: Array<{
  group: string;
  label: string;
  description: string;
  advanced?: boolean;
  properties: Array<{ label: string; category: string }>;
}> = [
  {
    group: "firmographic",
    label: "Company basics",
    description: "Core attributes of your ideal customer",
    properties: [
      { label: "Industry", category: "industry" },
      { label: "Region", category: "region" },
      { label: "Company size", category: "company_size" },
      { label: "Business model", category: "business_model" },
    ],
  },
  {
    group: "technographic",
    label: "Tech & product",
    description: "Tools, platforms, or infrastructure they use",
    properties: [
      { label: "Platform", category: "platform" },
      { label: "Payment method", category: "payment_method" },
      { label: "Tech stack", category: "tech_stack" },
    ],
  },
  {
    group: "behavioral",
    label: "Growth & activity",
    description: "Maturity, momentum, and market activity",
    properties: [
      { label: "Growth stage", category: "growth_stage" },
      { label: "Hiring activity", category: "hiring_activity" },
    ],
  },
  {
    group: "compliance",
    label: "Compliance & regulation",
    description: "Important for regulated products or industries",
    advanced: true,
    properties: [
      { label: "Regulatory status", category: "regulatory_status" },
      { label: "License type", category: "license_type" },
      { label: "Jurisdiction", category: "jurisdiction" },
    ],
  },
  {
    group: "keyword",
    label: "Keywords & custom",
    description: "Additional context and business-specific nuances",
    properties: [
      { label: "Keywords", category: "keyword" },
    ],
  },
];

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
