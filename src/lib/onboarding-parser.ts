import { getAiConfig, callAi } from "@/lib/ai-client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ParsedContext = {
  product: {
    companyName: string | null;
    productDescription: string;
    targetCustomers: string | null;
    coreUseCases: string[];
    keyValueProps: string[];
    industriesFocus: string[];
    geoFocus: string[];
  };
  icps: Array<{
    name: string;
    description: string;
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

const PARSE_SYSTEM_PROMPT = `You are the onboarding intelligence engine for iseep — a GTM (Go-To-Market) intelligence platform for B2B sales teams.

Your job is to analyze free-text input about a company and extract structured product context, an Ideal Customer Profile (ICP), and identify what information is missing.

## What iseep does

iseep helps B2B sales teams:
- Define and manage Ideal Customer Profiles (ICPs) with structured criteria
- Score leads against ICPs using deterministic + AI-assisted matching
- Discover new market segments from unmatched leads
- Track deals, win/loss reasons, and product requests for ICP refinement

## Product context fields to extract

- companyName: The name of the company (null if not mentioned)
- productDescription: What the company sells / does (required — synthesize from context if not explicit)
- targetCustomers: Who they sell to, in plain language (null if unclear)
- coreUseCases: Specific problems the product solves or jobs it does (array of strings)
- keyValueProps: Why customers choose this product over alternatives (array of strings)
- industriesFocus: Industries they target, using standard labels like "FinTech", "E-commerce", "SaaS", "Healthcare", "Gaming & Betting", "Logistics", etc. (array of strings)
- geoFocus: Geographic regions or countries they focus on, e.g. "EU", "US", "APAC", "UK", "LATAM" (array of strings)

## ICP criteria model

Each ICP has criteria organized by group, with an intent for each:

### Groups:
- "firmographic" — Core company characteristics: industry, company_size, region, business_model, revenue, funding_stage, employee_count
- "technographic" — Technology and tools: platform, tech_stack, payment_method, integrations, infrastructure
- "behavioral" — Observable activity patterns: growth_stage, hiring_activity, web_traffic, market_activity, product_usage
- "compliance" — Regulatory and legal factors: regulatory_status, license_type, jurisdiction, certifications
- "keyword" — Terms and topics associated with this profile: keyword, industry_term, product_term

### Intents:
- "qualify" — Positive fit indicator. This criterion makes a company MORE likely to be an ideal customer. Assign importance 1-10 (10 = most critical).
- "risk" — Soft warning flag. Having this criterion is a yellow flag but not a dealbreaker. No importance needed.
- "exclude" — Hard disqualifier. If a company matches this criterion, they are NOT a fit regardless of other matches. No importance needed.

### Categories (examples):
Firmographic: industry, region, company_size, business_model, revenue, funding_stage
Technographic: platform, tech_stack, payment_method, integrations
Behavioral: growth_stage, hiring_activity, web_traffic
Compliance: regulatory_status, license_type, jurisdiction
Keyword: keyword, industry_term

## Personas

Buyer personas are job titles / roles at target companies who would be involved in purchasing decisions. Each has:
- name: Job title (e.g. "VP of Engineering", "Head of Payments", "CFO")
- description: Brief context about why this persona cares about the product

## Missing questions

Identify 3-5 pieces of information that would significantly improve the ICP if known but are NOT present in the input. For each:
- id: A unique short identifier (e.g. "q1", "q2")
- question: The question to ask the user (clear, specific, actionable)
- hint: A helpful example or suggestion to guide the user's answer
- field: Which field this answer would help fill (e.g. "product.geoFocus", "icp.criteria.technographic", "icp.personas")

Focus questions on the most impactful missing information: deal-breaker criteria, key technologies, geographic scope, company size range, buyer personas.

## Confidence rating

- "high" — The text provides detailed, specific information about the product, customers, and market. You can extract a robust ICP.
- "medium" — The text provides reasonable information but is missing important details (e.g. no company size, no geography, vague product description).
- "low" — The text is vague, very short, or covers only one aspect of the business. The ICP will be speculative.

## Output format

Return ONLY valid JSON (no markdown, no explanation, no code blocks) with this exact structure:

{
  "product": {
    "companyName": "string or null",
    "productDescription": "string",
    "targetCustomers": "string or null",
    "coreUseCases": ["string"],
    "keyValueProps": ["string"],
    "industriesFocus": ["string"],
    "geoFocus": ["string"]
  },
  "icps": [
    {
      "name": "string — short label, e.g. 'Transportation & Logistics'",
      "description": "string — 1-2 sentence summary of this customer segment",
      "criteria": [
        {
          "group": "firmographic|technographic|behavioral|compliance|keyword",
          "category": "string",
          "value": "string — comma-separated if multiple values",
          "intent": "qualify|risk|exclude",
          "importance": "number 1-10 (only for qualify intent)",
          "note": "string — brief context (optional)"
        }
      ],
      "personas": [
        {
          "name": "Job Title",
          "description": "Why this persona matters"
        }
      ]
    }
  ],
  "missingQuestions": [
    {
      "id": "q1",
      "question": "string",
      "hint": "string",
      "field": "string"
    }
  ],
  "confidence": "high|medium|low"
}

## Guidelines

1. Extract EVERYTHING you can from the text. Be thorough — look for implicit information too.
2. Generate 3-5 distinct ICPs, one per major industry/vertical the product serves. Each ICP should represent a different customer segment (e.g., "Transportation & Logistics", "Agriculture", "Insurance"). Do NOT create one generic ICP — split by industry.
3. Each ICP should have 5-10 criteria across multiple groups. Include industry-specific criteria.
4. Each ICP should have at least 1 exclude criterion (disqualifiers specific to that segment).
5. Each ICP should have 2-3 personas relevant to that industry. If the text doesn't mention specific roles, infer likely buyer personas.
6. For importance scores: 8-10 for must-have criteria, 5-7 for important criteria, 1-4 for nice-to-have criteria.
7. Make questions specific and actionable — avoid generic questions like "tell me more about your product".
8. If the text is about a payments/fintech product, include compliance-related criteria.
9. Synthesize — don't just copy text verbatim. Transform raw information into structured, normalized criteria values.`;

const REFINE_SYSTEM_PROMPT = `You are the onboarding intelligence engine for iseep — a GTM intelligence platform for B2B sales teams.

You previously extracted structured product context and an ICP from a user's free-text input. Now the user has answered follow-up clarification questions. Your job is to merge these answers into the existing context and produce an updated, more complete result.

## What to do

1. Read the existing parsed context carefully.
2. Read each Q&A pair — the question ID maps to a specific field.
3. Merge the answers into the appropriate fields:
   - If an answer provides new criteria, ADD them to icp.criteria with the correct group/intent.
   - If an answer refines an existing criterion, UPDATE the value or add a note.
   - If an answer reveals product information, UPDATE the product fields.
   - If an answer mentions new personas, ADD them to icp.personas.
   - If an answer mentions exclusions or disqualifiers, add exclude-intent criteria.
4. Adjust the confidence rating upward if the answers filled significant gaps.
5. Do NOT include missingQuestions in the output — those are done.

## ICP criteria model

### Groups:
- "firmographic" — industry, company_size, region, business_model, revenue, funding_stage
- "technographic" — platform, tech_stack, payment_method, integrations
- "behavioral" — growth_stage, hiring_activity, web_traffic
- "compliance" — regulatory_status, license_type, jurisdiction
- "keyword" — keyword, industry_term, product_term

### Intents:
- "qualify" — Positive fit (importance 1-10)
- "risk" — Soft warning flag
- "exclude" — Hard disqualifier

## Output format

Return ONLY valid JSON (no markdown, no explanation, no code blocks):

{
  "product": {
    "companyName": "string or null",
    "productDescription": "string",
    "targetCustomers": "string or null",
    "coreUseCases": ["string"],
    "keyValueProps": ["string"],
    "industriesFocus": ["string"],
    "geoFocus": ["string"]
  },
  "icps": [
    { "name": "string", "description": "string", "criteria": [...], "personas": [...] }
  ],
  "missingQuestions": [],
  "confidence": "high|medium|low"
}

## Guidelines

1. Preserve all existing data that is not contradicted by answers.
2. Do not remove criteria or personas unless an answer explicitly invalidates them.
3. Add new criteria from answers — be specific and structured, not vague.
4. If an answer is vague or unhelpful (e.g. "I don't know", "N/A"), skip it — don't invent data.
5. Bump confidence up if answers filled major gaps (e.g. from "low" to "medium", or "medium" to "high").`;

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
  const rawProduct = (raw.product ?? {}) as Record<string, unknown>;
  const rawIcp = (raw.icp ?? {}) as Record<string, unknown>;
  const rawQuestions = raw.missingQuestions;
  const rawConfidence = raw.confidence;

  // ── Product ─────────────────────────────────────────────────────────────
  const product: ParsedContext["product"] = {
    companyName: typeof rawProduct.companyName === "string" ? rawProduct.companyName : null,
    productDescription:
      typeof rawProduct.productDescription === "string" && rawProduct.productDescription.length > 0
        ? rawProduct.productDescription
        : "No product description extracted",
    targetCustomers: typeof rawProduct.targetCustomers === "string" ? rawProduct.targetCustomers : null,
    coreUseCases: normalizeStringArray(rawProduct.coreUseCases),
    keyValueProps: normalizeStringArray(rawProduct.keyValueProps),
    industriesFocus: normalizeStringArray(rawProduct.industriesFocus),
    geoFocus: normalizeStringArray(rawProduct.geoFocus),
  };

  // ── ICPs ────────────────────────────────────────────────────────────────
  // Support both "icps" (array) and legacy "icp" (single object)
  const rawIcpArray = Array.isArray(raw.icps) ? raw.icps : (rawIcp.name ? [rawIcp] : []);

  const icps: ParsedContext["icps"] = rawIcpArray.map((rawIcpItem: Record<string, unknown>) => {
    const rawCriteria = Array.isArray(rawIcpItem.criteria) ? rawIcpItem.criteria : [];
    const rawPersonas = Array.isArray(rawIcpItem.personas) ? rawIcpItem.personas : [];

    const criteria = rawCriteria.map(
      (c: Record<string, unknown>) => {
        const intent = normalizeIntent(String(c.intent ?? "qualify"));
        return {
          group: normalizeGroup(String(c.group ?? "firmographic")),
          category: typeof c.category === "string" && c.category.length > 0 ? c.category : "unknown",
          value: typeof c.value === "string" && c.value.length > 0 ? c.value : "",
          intent,
          importance: intent === "qualify" ? normalizeImportance(c.importance) : undefined,
          note: typeof c.note === "string" && c.note.length > 0 ? c.note : undefined,
        };
      }
    ).filter((c) => c.value.length > 0);

    const personas = rawPersonas
      .map((p: Record<string, unknown>) => ({
        name: typeof p.name === "string" && p.name.length > 0 ? p.name : "",
        description: typeof p.description === "string" ? p.description : "",
      }))
      .filter((p) => p.name.length > 0);

    return {
      name: typeof rawIcpItem.name === "string" && rawIcpItem.name.length > 0 ? rawIcpItem.name : "ICP",
      description:
        typeof rawIcpItem.description === "string" && rawIcpItem.description.length > 0
          ? rawIcpItem.description
          : "Auto-generated ICP",
      criteria,
      personas,
    };
  });

  // Ensure at least one ICP
  if (icps.length === 0) {
    icps.push({
      name: "Primary ICP",
      description: "Auto-generated ICP from onboarding context",
      criteria: [],
      personas: [],
    });
  }

  // ── Missing questions ───────────────────────────────────────────────────
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

  // ── Confidence ──────────────────────────────────────────────────────────
  const confidence: ParsedContext["confidence"] =
    typeof rawConfidence === "string" &&
    (VALID_CONFIDENCE as readonly string[]).includes(rawConfidence.toLowerCase())
      ? (rawConfidence.toLowerCase() as ParsedContext["confidence"])
      : "low";

  return { product, icps, missingQuestions, confidence };
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

    const userPrompt = `Analyze the following text and extract structured product context, an Ideal Customer Profile, and identify missing information.

INPUT TEXT:
---
${text}
---

Remember: Return ONLY valid JSON. No markdown code blocks, no explanations, no extra text.`;

    const responseText = await callAi(config, PARSE_SYSTEM_PROMPT, userPrompt, 4000);

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

    const responseText = await callAi(config, REFINE_SYSTEM_PROMPT, userPrompt, 4000);

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
