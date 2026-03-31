import { getAiConfig, callAi } from "@/lib/ai-client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ParsedContext = {
  company: {
    name: string | null;
    website: string | null;
    description: string | null;
    targetCustomers: string | null;
    industriesFocus: string[];
    geoFocus: string[];
  };
  products: Array<{
    name: string;
    shortDescription: string | null;
    description: string;
    coreUseCases: string[];
    keyValueProps: string[];
    pricingModel: string | null;
    avgTicket: string | null;
  }>;
  icps: Array<{
    name: string;
    description: string;
    productRefs: string[];
    criteria: Array<{
      group: "firmographic" | "technographic" | "behavioral" | "compliance" | "keyword";
      category: string;
      value: string;
      intent: "qualify" | "risk" | "exclude";
      importance?: number;
      note?: string;
    }>;
    personas: Array<{
      name: string;
      description: string;
    }>;
  }>;
  missingQuestions: Array<{
    id: string;
    question: string;
    hint: string;
    field: string;
  }>;
  confidence: "high" | "medium" | "low";
};

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_GROUPS = ["firmographic", "technographic", "behavioral", "compliance", "keyword"] as const;
const VALID_INTENTS = ["qualify", "risk", "exclude"] as const;
const VALID_CONFIDENCE = ["high", "medium", "low"] as const;

// ─── System Prompt ──────────────────────────────────────────────────────────

const PARSE_SYSTEM_PROMPT = `You are the onboarding extraction engine for iseep — a sales intelligence tool for B2B teams.

Your job: analyze free-text input about a company and extract structured data for company info, products, and Ideal Customer Profiles (ICPs).

## Output structure

Return ONLY valid JSON (no markdown, no code blocks, no explanation):

{
  "company": {
    "name": "string or null",
    "website": "string or null — full URL if mentioned",
    "description": "string — what the company does overall (NOT a product description)",
    "targetCustomers": "string — who they sell to",
    "industriesFocus": ["industry labels"],
    "geoFocus": ["regions/countries"]
  },
  "products": [
    {
      "name": "string — product name, e.g. 'Accept Payments'",
      "shortDescription": "string — one sentence, max 100 chars",
      "description": "string — full description",
      "coreUseCases": ["string — specific jobs/flows this product enables"],
      "keyValueProps": ["string — why customers choose this product"],
      "pricingModel": "string or null — e.g. 'Per transaction', 'Subscription', 'Volume-based'",
      "avgTicket": "string or null — e.g. '$5,000/mo', '$1,000-$5,000/month'"
    }
  ],
  "icps": [
    {
      "name": "string — short segment label, e.g. 'Affiliate Networks'",
      "description": "string — 1-3 sentences describing this customer segment",
      "productRefs": ["product names this ICP is relevant to — must match product names exactly"],
      "criteria": [
        {
          "group": "firmographic|technographic|behavioral|compliance|keyword",
          "category": "industry|region|company_size|business_model|platform|tech_stack|payment_method|growth_stage|hiring_activity|regulatory_status|license_type|jurisdiction|keyword",
          "value": "string — specific value, comma-separated if multiple",
          "intent": "qualify|risk|exclude",
          "importance": 1-10,
          "note": "optional context"
        }
      ],
      "personas": [
        { "name": "Job Title", "description": "Why this persona cares about the product" }
      ]
    }
  ],
  "missingQuestions": [
    { "id": "q1", "question": "string", "hint": "string", "field": "string" }
  ],
  "confidence": "high|medium|low"
}

## Extraction rules

### Company vs Products
- "company" = the organization itself (name, website, overall mission, target market, regions)
- "products" = specific offerings/services the company sells (each with its own name, description, pricing, use cases)
- If the input describes multiple products, extract EACH as a separate product entry
- If only one product is described, still put it in the products array
- Company description should describe the company/platform overall, NOT repeat a single product description

### ICPs — CRITICAL
- If the user already defined ICPs with names, criteria, and weights — extract them EXACTLY as given
- Preserve the user's exact ICP names, criteria values, weights/importance, and intents
- Input like "Criteria (qualify): industry=Affiliate Networks (10)" means: group=firmographic, category=industry, value=Affiliate Networks, intent=qualify, importance=10
- Input like "Criteria (risk): region=UK, USA" means: group=firmographic, category=region, value=UK, USA, intent=risk, importance=5
- Input like "Personas: CEO, CFO, Head of Affiliates" means personas with those titles
- If user did NOT define ICPs, generate 3-5 ICPs based on the target industries and products described
- Each ICP must have 5-10 criteria across multiple groups
- Each ICP must have at least 1 exclude criterion
- Each ICP must have 2-3 personas

### Criteria details
- "qualify" (importance 1-10): positive fit signal. 8-10 = must-have, 5-7 = important, 1-4 = nice-to-have
- "risk" (importance 1-10, default 5): soft warning, yellow flag but not a dealbreaker
- "exclude" (importance 1-10, default 8): hard disqualifier, blocks the lead
- Groups: firmographic (industry, region, company_size, business_model, revenue, funding_stage), technographic (platform, tech_stack, payment_method), behavioral (growth_stage, hiring_activity), compliance (regulatory_status, license_type, jurisdiction), keyword
- For payments/fintech products, include compliance criteria

### productRefs
- Link each ICP to the products it applies to using exact product names from the products array
- If an ICP applies to all products, list all product names
- If empty, the ICP will be linked to all products

### Missing questions
- Generate 3-5 questions about information NOT in the input
- Focus on: deal-breaker criteria, technologies, company size, buyer personas, competitive landscape
- Each question must be specific and actionable

## Example

INPUT:
"ACME Corp (https://acme.io) builds payment APIs. Product 1: Checkout — online payment form, $500/mo avg. Product 2: Payouts — mass disbursements via API, $3000/mo avg. Target: e-commerce, marketplaces, gig economy in US and EU."

OUTPUT:
{
  "company": {
    "name": "ACME Corp",
    "website": "https://acme.io",
    "description": "Payment API platform for online businesses, enabling checkout and mass payouts",
    "targetCustomers": "E-commerce businesses, marketplaces, and gig economy platforms",
    "industriesFocus": ["E-commerce", "Marketplaces", "Gig Economy"],
    "geoFocus": ["US", "EU"]
  },
  "products": [
    {
      "name": "Checkout",
      "shortDescription": "Online payment form for accepting customer payments",
      "description": "Checkout enables businesses to accept online payments through customizable payment forms embedded on their websites",
      "coreUseCases": ["Online payment acceptance", "Subscription billing", "One-time purchases"],
      "keyValueProps": ["Easy integration", "Customizable UI", "Multi-currency"],
      "pricingModel": "Per transaction",
      "avgTicket": "$500/mo"
    },
    {
      "name": "Payouts",
      "shortDescription": "Mass disbursement API for paying recipients at scale",
      "description": "Payouts allows businesses to send money to multiple recipients efficiently through API-driven mass disbursements",
      "coreUseCases": ["Mass payouts", "Affiliate payments", "Creator payouts"],
      "keyValueProps": ["API-driven", "Scalable", "Global reach"],
      "pricingModel": "Volume-based",
      "avgTicket": "$3,000/mo"
    }
  ],
  "icps": [
    {
      "name": "E-commerce Platforms",
      "description": "Online retailers and e-commerce platforms that need payment acceptance and occasional payouts to suppliers",
      "productRefs": ["Checkout", "Payouts"],
      "criteria": [
        { "group": "firmographic", "category": "industry", "value": "E-commerce", "intent": "qualify", "importance": 9 },
        { "group": "firmographic", "category": "region", "value": "US, EU", "intent": "qualify", "importance": 6 },
        { "group": "firmographic", "category": "company_size", "value": "50-500 employees", "intent": "qualify", "importance": 5 },
        { "group": "technographic", "category": "platform", "value": "Shopify, WooCommerce, Custom", "intent": "qualify", "importance": 4 },
        { "group": "firmographic", "category": "region", "value": "Sanctioned countries", "intent": "exclude", "importance": 10 }
      ],
      "personas": [
        { "name": "CTO", "description": "Evaluates technical integration and API quality" },
        { "name": "Head of Payments", "description": "Owns payment infrastructure decisions" }
      ]
    }
  ],
  "missingQuestions": [
    { "id": "q1", "question": "What company size range is your sweet spot?", "hint": "e.g. 10-50 employees, $1M-$10M ARR", "field": "icp.criteria.firmographic" }
  ],
  "confidence": "medium"
}`;

const REFINE_SYSTEM_PROMPT = `You are the onboarding extraction engine for iseep. You previously extracted structured data from a user's free-text input. The user answered follow-up questions. Merge answers into the existing context.

## Rules
1. Preserve all existing data not contradicted by answers
2. Add new criteria, personas, or products from answers
3. If an answer refines an existing field, UPDATE it
4. If an answer is vague or "N/A", skip it
5. Bump confidence up if answers filled major gaps
6. Set missingQuestions to an empty array

## Output format
Return ONLY valid JSON with the same structure as the input (company, products, icps, missingQuestions: [], confidence).

Keep the exact same JSON schema:
- "company": { name, website, description, targetCustomers, industriesFocus, geoFocus }
- "products": [{ name, shortDescription, description, coreUseCases, keyValueProps, pricingModel, avgTicket }]
- "icps": [{ name, description, productRefs, criteria: [{ group, category, value, intent, importance }], personas: [{ name, description }] }]
- "missingQuestions": []
- "confidence": "high|medium|low"`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract JSON from an AI response that might be wrapped in markdown code blocks.
 */
function extractJson(text: string): string {
  // Try to extract from ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a top-level JSON object in the response
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0].trim();
  }

  return text.trim();
}

/**
 * Validate and normalize a criteria group value.
 */
function normalizeGroup(group: string): typeof VALID_GROUPS[number] {
  const lower = group?.toLowerCase?.() ?? "";
  if ((VALID_GROUPS as readonly string[]).includes(lower)) {
    return lower as typeof VALID_GROUPS[number];
  }
  return "firmographic";
}

/**
 * Validate and normalize a criteria intent value.
 */
function normalizeIntent(intent: string): typeof VALID_INTENTS[number] {
  const lower = intent?.toLowerCase?.() ?? "";
  if ((VALID_INTENTS as readonly string[]).includes(lower)) {
    return lower as typeof VALID_INTENTS[number];
  }
  return "qualify";
}

/**
 * Validate and normalize the full ParsedContext object, filling defaults for
 * any missing or malformed fields.
 */
function normalizeParsedContext(raw: Record<string, unknown>): ParsedContext {
  // ── Company ───────────────────────────────────────────────────────────
  const rawCompany = (raw.company ?? raw.product ?? {}) as Record<string, unknown>;

  const company: ParsedContext["company"] = {
    name: typeof rawCompany.name === "string" ? rawCompany.name
        : typeof rawCompany.companyName === "string" ? rawCompany.companyName
        : null,
    website: typeof rawCompany.website === "string" ? rawCompany.website : null,
    description: typeof rawCompany.description === "string" ? rawCompany.description
               : typeof rawCompany.companyDescription === "string" ? rawCompany.companyDescription
               : typeof rawCompany.productDescription === "string" ? rawCompany.productDescription
               : null,
    targetCustomers: typeof rawCompany.targetCustomers === "string" ? rawCompany.targetCustomers : null,
    industriesFocus: normalizeStringArray(rawCompany.industriesFocus),
    geoFocus: normalizeStringArray(rawCompany.geoFocus),
  };

  // ── Products ──────────────────────────────────────────────────────────
  const rawProducts = Array.isArray(raw.products) ? raw.products : [];

  const productsArr: ParsedContext["products"] = rawProducts.map((rp: Record<string, unknown>) => ({
    name: typeof rp.name === "string" && rp.name.length > 0 ? rp.name : "Product",
    shortDescription: typeof rp.shortDescription === "string" ? rp.shortDescription : null,
    description: typeof rp.description === "string" && rp.description.length > 0
      ? rp.description : "No description extracted",
    coreUseCases: normalizeStringArray(rp.coreUseCases),
    keyValueProps: normalizeStringArray(rp.keyValueProps),
    pricingModel: typeof rp.pricingModel === "string" ? rp.pricingModel : null,
    avgTicket: typeof rp.avgTicket === "string" ? rp.avgTicket : null,
  }));

  // If AI returned no products, create a fallback from company description
  if (productsArr.length === 0) {
    productsArr.push({
      name: company.name || "Default Product",
      shortDescription: null,
      description: company.description || "No product description extracted",
      coreUseCases: [],
      keyValueProps: [],
      pricingModel: null,
      avgTicket: null,
    });
  }

  // ── ICPs ──────────────────────────────────────────────────────────────
  const rawIcp = (raw.icp ?? {}) as Record<string, unknown>;
  const rawIcpArray = Array.isArray(raw.icps) ? raw.icps : (rawIcp.name ? [rawIcp] : []);

  const icpsArr: ParsedContext["icps"] = rawIcpArray.map((rawIcpItem: Record<string, unknown>) => {
    const rawCriteria = Array.isArray(rawIcpItem.criteria) ? rawIcpItem.criteria : [];
    const rawPersonas = Array.isArray(rawIcpItem.personas) ? rawIcpItem.personas : [];

    const criteriaArr = rawCriteria.map((c: Record<string, unknown>) => {
      const intent = normalizeIntent(String(c.intent ?? "qualify"));
      return {
        group: normalizeGroup(String(c.group ?? "firmographic")),
        category: typeof c.category === "string" && c.category.length > 0 ? c.category : "unknown",
        value: typeof c.value === "string" && c.value.length > 0 ? c.value : "",
        intent,
        importance: intent === "qualify" ? normalizeImportance(c.importance)
                  : intent === "exclude" ? normalizeImportance(c.importance ?? 8)
                  : normalizeImportance(c.importance ?? 5),
        note: typeof c.note === "string" && c.note.length > 0 ? c.note : undefined,
      };
    }).filter((c) => c.value.length > 0);

    const personasArr = rawPersonas
      .map((p: Record<string, unknown>) => ({
        name: typeof p.name === "string" && p.name.length > 0 ? p.name : "",
        description: typeof p.description === "string" ? p.description : "",
      }))
      .filter((p) => p.name.length > 0);

    return {
      name: typeof rawIcpItem.name === "string" && rawIcpItem.name.length > 0 ? rawIcpItem.name : "ICP",
      description: typeof rawIcpItem.description === "string" && rawIcpItem.description.length > 0
        ? rawIcpItem.description : "Auto-generated ICP",
      productRefs: normalizeStringArray(rawIcpItem.productRefs),
      criteria: criteriaArr,
      personas: personasArr,
    };
  });

  if (icpsArr.length === 0) {
    icpsArr.push({
      name: "Primary ICP",
      description: "Auto-generated ICP from onboarding context",
      productRefs: [],
      criteria: [],
      personas: [],
    });
  }

  // ── Missing questions ─────────────────────────────────────────────────
  const rawQuestions = raw.missingQuestions;
  const missingQuestions: ParsedContext["missingQuestions"] = Array.isArray(rawQuestions)
    ? rawQuestions
        .map((q: Record<string, unknown>, idx: number) => ({
          id: typeof q.id === "string" && q.id.length > 0 ? q.id : `q${idx + 1}`,
          question: typeof q.question === "string" ? q.question : "",
          hint: typeof q.hint === "string" ? q.hint : "",
          field: typeof q.field === "string" ? q.field : "unknown",
        }))
        .filter((q) => q.question.length > 0)
    : [];

  // ── Confidence ────────────────────────────────────────────────────────
  const rawConfidence = raw.confidence;
  const confidence: ParsedContext["confidence"] =
    typeof rawConfidence === "string" &&
    (VALID_CONFIDENCE as readonly string[]).includes(rawConfidence.toLowerCase())
      ? (rawConfidence.toLowerCase() as ParsedContext["confidence"])
      : "low";

  return { company, products: productsArr, icps: icpsArr, missingQuestions, confidence };
}

/**
 * Normalize a value to a string[], handling various input shapes.
 */
function normalizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((s) => s.length > 0);
  }
  if (typeof val === "string" && val.length > 0) {
    return val.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return [];
}

/**
 * Normalize importance to a number 1-10, defaulting to 5.
 */
function normalizeImportance(val: unknown): number {
  const n = typeof val === "number" ? val : Number(val);
  if (isNaN(n)) return 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}

// ─── Function 1: parseOnboardingContext ─────────────────────────────────────

/**
 * Takes free-text input about a company and extracts structured product context,
 * a primary ICP with criteria and personas, and identifies missing information.
 *
 * Returns null on failure.
 */
export async function parseOnboardingContext(
  text: string,
  workspaceId: string,
): Promise<ParsedContext | null> {
  try {
    const config = await getAiConfig(workspaceId);

    const userPrompt = `Analyze the following text and extract structured company info, products, and Ideal Customer Profiles.

INPUT TEXT:
---
${text}
---

Remember: Return ONLY valid JSON. No markdown code blocks, no explanations, no extra text.`;

    const responseText = await callAi(config, PARSE_SYSTEM_PROMPT, userPrompt, 8000);

    const jsonStr = extractJson(responseText);
    const raw = JSON.parse(jsonStr) as Record<string, unknown>;

    return normalizeParsedContext(raw);
  } catch (e) {
    console.error("[onboarding-parser] parseOnboardingContext failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

// ─── Function 2: refineOnboardingContext ────────────────────────────────────

/**
 * Takes the existing parsed context and user's answers to clarification questions,
 * then uses AI to merge and refine the ICP and product context.
 *
 * Returns null on failure.
 */
export async function refineOnboardingContext(
  existing: ParsedContext,
  answers: Record<string, string>,
  workspaceId: string,
): Promise<ParsedContext | null> {
  try {
    // Filter out empty answers
    const validAnswers = Object.entries(answers).filter(
      ([, v]) => v.trim().length > 0
    );

    // If no answers provided, return existing context without questions
    if (validAnswers.length === 0) {
      return {
        ...existing,
        missingQuestions: [],
      };
    }

    // Build Q&A pairs keyed by the question text for context
    const qaPairs = validAnswers.map(([questionId, answer]) => {
      const question = existing.missingQuestions.find((q) => q.id === questionId);
      return {
        questionId,
        question: question?.question ?? questionId,
        field: question?.field ?? "unknown",
        answer,
      };
    });

    const config = await getAiConfig(workspaceId);

    const userPrompt = `Here is the existing parsed context from the user's initial onboarding input:

EXISTING CONTEXT:
${JSON.stringify(existing, null, 2)}

The user answered the following clarification questions:

ANSWERS:
${qaPairs.map((qa) => `- [${qa.questionId}] (field: ${qa.field}) Q: ${qa.question}\n  A: ${qa.answer}`).join("\n\n")}

Merge these answers into the existing context. Update product fields, add/refine ICP criteria and personas as appropriate. Set missingQuestions to an empty array. Return ONLY valid JSON, no markdown code blocks.`;

    const responseText = await callAi(config, REFINE_SYSTEM_PROMPT, userPrompt, 8000);

    const jsonStr = extractJson(responseText);
    const raw = JSON.parse(jsonStr) as Record<string, unknown>;

    const refined = normalizeParsedContext(raw);

    // Ensure missingQuestions is always empty after refinement
    refined.missingQuestions = [];

    return refined;
  } catch {
    return null;
  }
}
