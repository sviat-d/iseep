# Onboarding AI Extraction Quality Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 12 problems in the onboarding pipeline so rich user input (multi-product, explicit ICPs, website, pricing) produces rich output instead of empty/generic results.

**Architecture:** Restructure `ParsedContext` type to separate company from products (array), add all missing fields (website, shortDescription, pricingModel, avgTicket, product names), rewrite AI prompts with few-shot example + explicit instructions for structured input, fix the action layer to create multiple products with correct field mapping, persist parsed context in DB instead of in-memory cache, fix the reveal page to read from correct tables.

**Tech Stack:** TypeScript, Drizzle ORM, Supabase PostgreSQL, Anthropic/OpenAI API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/onboarding-parser.ts` | **Modify** | New `ParsedContext` type (company + products[]), rewritten AI prompts, updated normalizer |
| `src/actions/onboarding.ts` | **Modify** | Multi-product creation, persistent cache in DB, correct field mapping, weight fixes |
| `src/db/schema.ts` | **Modify** | Add `onboardingData` JSONB field to workspaces |
| `drizzle/migrations/0018_onboarding_data.sql` | **Create** | Migration for new column |
| `src/components/onboarding/step-clarify.tsx` | **Modify** | Show products[] and company separately in "What we understood" |
| `src/components/onboarding/step-reveal.tsx` | **Modify** | Accept products[] in props, show each product card |
| `src/components/onboarding/onboarding-wizard.tsx` | **Modify** | Update types for multi-product revealData |
| `src/app/(app)/dashboard/page.tsx` | **Modify** | Fix reveal step to read from workspaces + products (not legacy productContext) |

---

### Task 1: Add `onboardingData` JSONB column to workspaces

Fixes problem #11 (in-memory cache lost on serverless restart).

**Files:**
- Modify: `src/db/schema.ts:20-35`
- Create: `drizzle/migrations/0018_onboarding_data.sql`

- [ ] **Step 1: Add column to schema**

In `src/db/schema.ts`, add to the workspaces table definition after `onboardingStep`:

```ts
onboardingData: jsonb("onboarding_data"), // ParsedContext JSON, cleared after onboarding
```

- [ ] **Step 2: Create migration file**

Create `drizzle/migrations/0018_onboarding_data.sql`:

```sql
ALTER TABLE "workspaces" ADD COLUMN "onboarding_data" jsonb;
```

- [ ] **Step 3: Update migration meta**

Run: `pnpm drizzle-kit generate`

If it generates a different migration, use that instead and delete the manual one. If drizzle-kit is unavailable, push directly:

Run: `pnpm drizzle-kit push`

- [ ] **Step 4: Verify**

Run: `pnpm build 2>&1 | grep -iE "error" | head -5`
Expected: No errors

---

### Task 2: Restructure `ParsedContext` type for multi-product + company separation

Fixes problems #1, #2, #3, #5.

**Files:**
- Modify: `src/lib/onboarding-parser.ts:5-38`

- [ ] **Step 1: Replace the ParsedContext type**

Replace the existing `ParsedContext` type (lines 5-38) with:

```ts
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
    productRefs: string[]; // product names this ICP applies to
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
```

- [ ] **Step 2: Update `normalizeParsedContext` to handle new structure**

Replace the entire `normalizeParsedContext` function with:

```ts
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
  // Support "icps" array, legacy "icp" single object
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

  // Ensure at least one ICP
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
```

- [ ] **Step 3: Verify build**

Run: `pnpm build 2>&1 | grep -iE "error" | head -10`
Expected: Type errors in files that use `ParsedContext.product` — this is expected, we fix them in later tasks.

---

### Task 3: Rewrite AI system prompt for multi-product + few-shot + explicit ICP extraction

Fixes problems #4, #7, #8, #9, #10.

**Files:**
- Modify: `src/lib/onboarding-parser.ts:46-172` (PARSE_SYSTEM_PROMPT)
- Modify: `src/lib/onboarding-parser.ts:174-232` (REFINE_SYSTEM_PROMPT)
- Modify: `src/lib/onboarding-parser.ts:410-419` (user prompt + maxTokens)

- [ ] **Step 1: Replace PARSE_SYSTEM_PROMPT**

Replace the entire `PARSE_SYSTEM_PROMPT` constant (lines 48-172) with:

```ts
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
```

- [ ] **Step 2: Replace REFINE_SYSTEM_PROMPT**

Replace the entire `REFINE_SYSTEM_PROMPT` constant (lines 174-232) with:

```ts
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
```

- [ ] **Step 3: Update user prompt text and maxTokens**

In `parseOnboardingContext` function, replace the user prompt and callAi call:

```ts
const userPrompt = `Analyze the following text and extract structured company info, products, and Ideal Customer Profiles.

INPUT TEXT:
---
${text}
---

Return ONLY valid JSON. No markdown code blocks, no explanations.`;

const responseText = await callAi(config, PARSE_SYSTEM_PROMPT, userPrompt, 8000);
```

In `refineOnboardingContext` function, update the maxTokens:

```ts
const responseText = await callAi(config, REFINE_SYSTEM_PROMPT, userPrompt, 8000);
```

- [ ] **Step 4: Update the refine user prompt to use new structure**

In `refineOnboardingContext`, the user prompt already sends `JSON.stringify(existing)` which will now include the new structure. No change needed to the refine user prompt itself.

- [ ] **Step 5: Verify build of parser file**

Run: `pnpm build 2>&1 | grep -iE "error" | head -10`
Expected: Type errors in consumers — expected, will fix next.

---

### Task 4: Update `parseContext` and `refineContext` actions for multi-product + DB cache

Fixes problems #1, #2, #3, #5, #6, #9, #11, #12.

**Files:**
- Modify: `src/actions/onboarding.ts`

- [ ] **Step 1: Replace `parseContext` action**

Replace the entire `parseContext` function with:

```ts
export async function parseContext(
  text: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!text.trim()) return { error: "Please provide some context about your company." };

  try {
    const parsed = await parseOnboardingContext(text, ctx.workspaceId);
    if (!parsed) {
      const { getAiConfig } = await import("@/lib/ai-client");
      const config = await getAiConfig(ctx.workspaceId);
      if (!config.apiKey) {
        return { error: "AI is not configured. Please add your API key in AI Settings (/settings/ai) or ask your workspace owner to set up the platform key." };
      }
      return { error: "Could not parse your context. Please try adding more detail." };
    }

    // Save COMPANY info to workspaces + cache ParsedContext in DB
    const company = parsed.company;
    await db
      .update(workspaces)
      .set({
        onboardingStep: 1,
        name: company.name || undefined,
        website: company.website || undefined,
        companyDescription: company.description || null,
        targetCustomers: company.targetCustomers || null,
        industriesFocus: company.industriesFocus,
        geoFocus: company.geoFocus,
        onboardingData: parsed as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to analyze context: ${msg}` };
  }
}
```

- [ ] **Step 2: Replace `getParsedContext` to read from DB**

```ts
export async function getParsedContext(): Promise<ParsedContext | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const [ws] = await db
    .select({
      onboardingData: workspaces.onboardingData,
      name: workspaces.name,
      website: workspaces.website,
      companyDescription: workspaces.companyDescription,
      targetCustomers: workspaces.targetCustomers,
      industriesFocus: workspaces.industriesFocus,
      geoFocus: workspaces.geoFocus,
    })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));

  if (!ws) return null;

  // If we have cached onboardingData, return it directly
  if (ws.onboardingData) {
    return ws.onboardingData as unknown as ParsedContext;
  }

  // Fallback: reconstruct minimal context from workspace fields
  return {
    company: {
      name: ws.name,
      website: ws.website ?? null,
      description: ws.companyDescription ?? null,
      targetCustomers: ws.targetCustomers ?? null,
      industriesFocus: (ws.industriesFocus as string[]) ?? [],
      geoFocus: (ws.geoFocus as string[]) ?? [],
    },
    products: [],
    icps: [{
      name: "Auto-generated ICP",
      description: "",
      productRefs: [],
      criteria: [],
      personas: [],
    }],
    missingQuestions: [],
    confidence: "low",
  };
}
```

- [ ] **Step 3: Replace `refineContext` for multi-product creation + correct weights**

Replace the entire `refineContext` function:

```ts
export async function refineContext(
  answers: Record<string, string>,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  try {
    let parsed = await getParsedContext();
    if (!parsed) {
      return { error: "No parsed context found. Please go back and provide your context again." };
    }

    // Refine with AI if user provided answers
    const hasAnswers = Object.values(answers).some((v) => v.trim());
    if (hasAnswers) {
      const refined = await refineOnboardingContext(parsed, answers, ctx.workspaceId);
      if (refined) parsed = refined;
    }

    // Update COMPANY info on workspaces
    const company = parsed.company;
    await db
      .update(workspaces)
      .set({
        name: company.name || undefined,
        website: company.website || undefined,
        companyDescription: company.description || null,
        targetCustomers: company.targetCustomers || null,
        industriesFocus: company.industriesFocus,
        geoFocus: company.geoFocus,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    // Create ALL products from parsed data
    const productNameToId = new Map<string, string>();

    for (const productData of parsed.products) {
      const [newProduct] = await db.insert(products).values({
        workspaceId: ctx.workspaceId,
        name: productData.name,
        shortDescription: productData.shortDescription || null,
        description: productData.description || null,
        coreUseCases: productData.coreUseCases,
        keyValueProps: productData.keyValueProps,
        pricingModel: productData.pricingModel || null,
        avgTicket: productData.avgTicket || null,
      }).returning({ id: products.id });

      productNameToId.set(productData.name, newProduct.id);
    }

    // If no products were created (edge case), create a default
    if (productNameToId.size === 0) {
      const [defaultProduct] = await db.insert(products).values({
        workspaceId: ctx.workspaceId,
        name: company.name || "Default Product",
        description: company.description || null,
      }).returning({ id: products.id });
      productNameToId.set(company.name || "Default Product", defaultProduct.id);
    }

    const allProductIds = Array.from(productNameToId.values());

    // Create ACTIVE ICPs and link to products
    const { logActivity } = await import("@/lib/activity");

    for (const icpData of parsed.icps) {
      const [newIcp] = await db
        .insert(icps)
        .values({
          workspaceId: ctx.workspaceId,
          name: icpData.name || "ICP",
          description: icpData.description || null,
          status: "active",
          version: 1,
          createdBy: ctx.userId,
        })
        .returning();

      // Resolve product links from productRefs (names) to IDs
      let linkedProductIds: string[];
      if (icpData.productRefs.length > 0) {
        linkedProductIds = icpData.productRefs
          .map((ref) => productNameToId.get(ref))
          .filter((id): id is string => !!id);
        // If no refs matched, link to all products
        if (linkedProductIds.length === 0) linkedProductIds = allProductIds;
      } else {
        linkedProductIds = allProductIds;
      }

      // Link ICP to products via many-to-many
      for (const productId of linkedProductIds) {
        await db.insert(productIcps).values({
          workspaceId: ctx.workspaceId,
          productId,
          icpId: newIcp.id,
        });
      }

      if (icpData.criteria.length > 0) {
        await db.insert(criteria).values(
          icpData.criteria.map((c) => ({
            workspaceId: ctx.workspaceId,
            icpId: newIcp.id,
            group: c.group,
            category: c.category,
            value: c.value,
            operator: "equals" as const,
            intent: c.intent,
            weight: c.importance ?? (c.intent === "exclude" ? 8 : c.intent === "risk" ? 5 : 5),
            note: c.note || null,
          })),
        );
      }

      if (icpData.personas.length > 0) {
        await db.insert(personas).values(
          icpData.personas.map((p) => ({
            workspaceId: ctx.workspaceId,
            icpId: newIcp.id,
            name: p.name,
            description: p.description || null,
          })),
        );
      }

      await logActivity(ctx.workspaceId, ctx.userId, {
        eventType: "icp_created",
        entityType: "icp",
        entityId: newIcp.id,
        summary: `Created ICP "${newIcp.name}" from onboarding`,
      });
    }

    // Advance to step 2 (reveal) + clear onboarding cache
    await db
      .update(workspaces)
      .set({
        onboardingStep: 2,
        onboardingData: null,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    revalidatePath("/dashboard");
    revalidatePath("/icps");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to create your profile: ${msg}` };
  }
}
```

- [ ] **Step 4: Remove the in-memory cache**

Delete the line:
```ts
let _parsedContextCache: Map<string, ParsedContext> = new Map();
```

And remove all references to `_parsedContextCache` (there should be none left after the above replacements).

- [ ] **Step 5: Verify build**

Run: `pnpm build 2>&1 | grep -iE "error" | head -10`

---

### Task 5: Update step-clarify component for new ParsedContext structure

**Files:**
- Modify: `src/components/onboarding/step-clarify.tsx`

- [ ] **Step 1: Update the "What we understood" card**

Replace the destructuring and CardContent (lines 51, 78-126) to use `company` + `products`:

Change line 51 from:
```ts
const { product, icps, missingQuestions } = parsedContext;
```
to:
```ts
const { company, products, icps, missingQuestions } = parsedContext;
```

Replace the CardContent inner content (lines 78-126) with:

```tsx
<CardContent className="space-y-3">
  {company.name && (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Company</p>
      <p className="text-sm">{company.name}{company.website && <span className="ml-1 text-muted-foreground">({company.website})</span>}</p>
    </div>
  )}
  {company.description && (
    <div>
      <p className="text-xs font-medium text-muted-foreground">About</p>
      <p className="text-sm">{company.description}</p>
    </div>
  )}
  {company.targetCustomers && (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Target customers</p>
      <p className="text-sm">{company.targetCustomers}</p>
    </div>
  )}
  <div className="flex flex-wrap gap-1.5">
    {company.industriesFocus.map((ind) => (
      <Badge key={ind} variant="secondary" className="text-xs">
        {ind}
      </Badge>
    ))}
    {company.geoFocus.map((geo) => (
      <Badge key={geo} variant="outline" className="text-xs">
        {geo}
      </Badge>
    ))}
  </div>
  {products.length > 0 && (
    <div>
      <p className="text-xs font-medium text-muted-foreground">
        {products.length} product{products.length > 1 ? "s" : ""} detected
      </p>
      <div className="space-y-1 mt-1">
        {products.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <p className="text-sm font-medium">{p.name}</p>
            {p.shortDescription && (
              <span className="text-xs text-muted-foreground">{p.shortDescription}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )}
  {icps.length > 0 && (
    <div>
      <p className="text-xs font-medium text-muted-foreground">
        {icps.length} ICP{icps.length > 1 ? "s" : ""} detected
      </p>
      <div className="space-y-1 mt-1">
        {icps.map((icp, i) => (
          <div key={i} className="flex items-center gap-2">
            <p className="text-sm font-medium">{icp.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {icp.criteria.length} criteria
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )}
</CardContent>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build 2>&1 | grep -iE "error" | head -10`

---

### Task 6: Update step-reveal and onboarding-wizard for multi-product

Fixes problem #12 (reveal reads from wrong table).

**Files:**
- Modify: `src/components/onboarding/step-reveal.tsx`
- Modify: `src/components/onboarding/onboarding-wizard.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update RevealProps type in step-reveal.tsx**

Replace the `RevealProps` type (lines 45-55) with:

```tsx
type RevealProduct = {
  name: string;
  shortDescription: string | null;
  description: string;
  coreUseCases: string[];
  keyValueProps: string[];
  pricingModel: string | null;
  avgTicket: string | null;
};

type RevealProps = {
  company: {
    name: string | null;
    website: string | null;
    description: string | null;
    targetCustomers: string | null;
    industriesFocus: string[];
    geoFocus: string[];
  };
  products: RevealProduct[];
  icps: IcpReveal[];
};
```

- [ ] **Step 2: Update StepReveal component to use new props**

Change the function signature from:
```tsx
export function StepReveal({ product, icps }: RevealProps) {
```
to:
```tsx
export function StepReveal({ company, products, icps }: RevealProps) {
```

Replace the "Company Profile" card content (lines 101-151) with:

```tsx
{/* Company Profile */}
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-base">
      <Building2 className="h-4 w-4" />
      Company Profile
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {company.name && (
      <p className="text-lg font-semibold">
        {company.name}
        {company.website && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">{company.website}</span>
        )}
      </p>
    )}
    {company.description && (
      <p className="text-sm text-muted-foreground">{company.description}</p>
    )}
    {company.targetCustomers && (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Target customers</p>
        <p className="text-sm">{company.targetCustomers}</p>
      </div>
    )}
    <div className="flex flex-wrap gap-3">
      {company.industriesFocus.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Industries</p>
          <div className="flex flex-wrap gap-1">
            {company.industriesFocus.map((ind) => (
              <Badge key={ind} variant="outline" className="text-xs">{ind}</Badge>
            ))}
          </div>
        </div>
      )}
      {company.geoFocus.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Regions</p>
          <div className="flex flex-wrap gap-1">
            {company.geoFocus.map((geo) => (
              <Badge key={geo} variant="outline" className="text-xs">
                <Globe className="mr-0.5 h-2.5 w-2.5" />{geo}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  </CardContent>
</Card>

{/* Products */}
{products.length > 0 && products.map((product, idx) => (
  <Card key={idx}>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{product.name}</CardTitle>
      {product.shortDescription && (
        <p className="text-sm text-muted-foreground">{product.shortDescription}</p>
      )}
    </CardHeader>
    <CardContent className="space-y-2">
      {product.description && product.description !== product.shortDescription && (
        <p className="text-sm text-muted-foreground">{product.description}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {product.coreUseCases.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Use cases</p>
            <div className="flex flex-wrap gap-1">
              {product.coreUseCases.map((uc) => (
                <Badge key={uc} variant="secondary" className="text-xs">{uc}</Badge>
              ))}
            </div>
          </div>
        )}
        {product.keyValueProps.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Value props</p>
            <div className="flex flex-wrap gap-1">
              {product.keyValueProps.map((vp) => (
                <Badge key={vp} variant="outline" className="text-xs">{vp}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      {(product.pricingModel || product.avgTicket) && (
        <p className="text-xs text-muted-foreground">
          {[product.pricingModel, product.avgTicket].filter(Boolean).join(" · ")}
        </p>
      )}
    </CardContent>
  </Card>
))}
```

- [ ] **Step 3: Update the description text to include product count**

Change line 97:
```tsx
<p className="mt-2 text-muted-foreground">
  iseep created your company profile and {icps.length} ICP{icps.length > 1 ? "s" : ""} from your context. Everything is editable.
</p>
```
to:
```tsx
<p className="mt-2 text-muted-foreground">
  iseep created your company profile, {products.length} product{products.length > 1 ? "s" : ""}, and {icps.length} ICP{icps.length > 1 ? "s" : ""} from your context. Everything is editable.
</p>
```

- [ ] **Step 4: Update OnboardingWizard types**

In `onboarding-wizard.tsx`, replace the `revealData` type in `OnboardingWizardProps` (lines 17-37):

```tsx
type OnboardingWizardProps = {
  step: number;
  parsedContext?: ParsedContext | null;
  revealData?: {
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
      id: string;
      name: string;
      description: string | null;
      criteriaCount: number;
      personaCount: number;
      qualifyCriteria: Array<{ category: string; value: string }>;
      riskCriteria: Array<{ category: string; value: string }>;
      excludeCriteria: Array<{ category: string; value: string }>;
      personas: Array<{ name: string }>;
    }>;
  } | null;
};
```

Update the StepReveal render (line 88) from:
```tsx
<StepReveal product={revealData.product} icps={revealData.icps} />
```
to:
```tsx
<StepReveal company={revealData.company} products={revealData.products} icps={revealData.icps} />
```

- [ ] **Step 5: Fix dashboard/page.tsx reveal data construction**

In `src/app/(app)/dashboard/page.tsx`, replace the reveal data construction (lines 29-83):

```tsx
// Step 2: Reveal — need company + products + ALL ICPs
if (ctx.onboardingStep === 2) {
  const { inArray } = await import("drizzle-orm");

  // Fetch workspace (company info)
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));

  // Fetch all products
  const { products: productsTable } = await import("@/db/schema");
  const allProducts = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.workspaceId, ctx.workspaceId));

  const activeIcps = await db
    .select()
    .from(icps)
    .where(
      and(
        eq(icps.workspaceId, ctx.workspaceId),
        eq(icps.status, "active"),
      ),
    )
    .orderBy(desc(icps.createdAt));

  const icpIds = activeIcps.map(i => i.id);
  const [allCriteria, allPersonas] = icpIds.length > 0
    ? await Promise.all([
        db.select().from(criteria).where(inArray(criteria.icpId, icpIds)),
        db.select().from(personas).where(inArray(personas.icpId, icpIds)),
      ])
    : [[], []];

  const revealData = {
    company: {
      name: ws?.name ?? null,
      website: ws?.website ?? null,
      description: ws?.companyDescription ?? null,
      targetCustomers: ws?.targetCustomers ?? null,
      industriesFocus: (ws?.industriesFocus as string[]) ?? [],
      geoFocus: (ws?.geoFocus as string[]) ?? [],
    },
    products: allProducts.map(p => ({
      name: p.name,
      shortDescription: p.shortDescription ?? null,
      description: p.description ?? "",
      coreUseCases: (p.coreUseCases as string[]) ?? [],
      keyValueProps: (p.keyValueProps as string[]) ?? [],
      pricingModel: p.pricingModel ?? null,
      avgTicket: p.avgTicket ?? null,
    })),
    icps: activeIcps.map(icp => {
      const icpCriteria = allCriteria.filter(c => c.icpId === icp.id);
      const icpPersonas = allPersonas.filter(p => p.icpId === icp.id);
      return {
        id: icp.id,
        name: icp.name,
        description: icp.description,
        criteriaCount: icpCriteria.length,
        personaCount: icpPersonas.length,
        qualifyCriteria: icpCriteria
          .filter(c => c.intent === "qualify")
          .map(c => ({ category: c.category, value: c.value })),
        riskCriteria: icpCriteria
          .filter(c => c.intent === "risk")
          .map(c => ({ category: c.category, value: c.value })),
        excludeCriteria: icpCriteria
          .filter(c => c.intent === "exclude")
          .map(c => ({ category: c.category, value: c.value })),
        personas: icpPersonas.map(p => ({ name: p.name })),
      };
    }),
  };

  return <OnboardingWizard step={2} revealData={revealData} />;
}
```

Also remove the `getProductContext` import from the top of the file (line 7) since it's no longer used for reveal step. Keep it only if it's still used for the dashboard section. Check: it IS used on line 92 for the regular dashboard view, so keep the import.

- [ ] **Step 6: Verify full build**

Run: `pnpm build 2>&1 | grep -iE "error" | head -5`
Expected: No errors

---

### Task 7: Final verification and build

- [ ] **Step 1: Run full build**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No new lint errors

- [ ] **Step 3: Verify the schema push**

Run: `pnpm drizzle-kit push`

This pushes the `onboarding_data` column to the database.

- [ ] **Step 4: Commit**

```bash
git add src/lib/onboarding-parser.ts src/actions/onboarding.ts src/db/schema.ts \
  src/components/onboarding/step-clarify.tsx src/components/onboarding/step-reveal.tsx \
  src/components/onboarding/onboarding-wizard.tsx src/app/\(app\)/dashboard/page.tsx \
  drizzle/
git commit -m "feat: overhaul onboarding AI extraction — multi-product, company/product separation, persistent cache, few-shot prompt, weight fixes"
```
