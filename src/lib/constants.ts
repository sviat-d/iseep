// Display labels for criteria group enum values
// DB values stay: firmographic, technographic, behavioral, compliance, keyword
export const GROUP_LABELS: Record<string, string> = {
  firmographic: "Company",
  technographic: "Tech & Tools",
  behavioral: "Activity",
  compliance: "Compliance",
  keyword: "Keywords",
};

export const GROUP_DESCRIPTIONS: Record<string, string> = {
  firmographic: "Core company characteristics — industry, size, geography, business model.",
  technographic: "Technology and tools they use — platforms, integrations, infrastructure.",
  behavioral: "Observable patterns — growth, hiring, web traffic, market activity.",
  compliance: "Regulatory and legal factors that affect whether they can work with you.",
  keyword: "Terms and topics associated with this customer profile.",
};

export const EXCLUSIONS_DESCRIPTION =
  "Hard disqualifiers. If any of these match, the company is not your ICP — even if everything else fits.";

export const GROUP_EMPTY_SUGGESTIONS: Record<string, string[]> = {
  firmographic: [
    "Industry (e.g. FinTech, E-commerce)",
    "Region (e.g. EU, US, APAC)",
    "Company size (e.g. 50-500 employees)",
  ],
  technographic: [
    "Platform (e.g. Shopify, WooCommerce)",
    "Tech stack (e.g. crypto payments, PSP)",
    "Integration (e.g. Stripe, PayPal)",
  ],
  behavioral: [
    "Web traffic (e.g. > 100k monthly)",
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
  { label: "Keywords", category: "keyword", group: "keyword" },
];
