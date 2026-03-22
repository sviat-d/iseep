import Anthropic from "@anthropic-ai/sdk";

export type ParsedIcp = {
  name: string;
  description: string;
  criteria: Array<{
    group: string;
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
};

export async function parseIcpText(text: string): Promise<ParsedIcp> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Parse the following ICP (Ideal Customer Profile) description into structured data.

Extract:
1. ICP name (short label)
2. Description (1-2 sentence summary)
3. Criteria (company attributes) — each with:
   - group: one of "firmographic", "technographic", "behavioral", "compliance", "keyword"
   - category: specific property (e.g. "industry", "region", "company_size", "platform", "tech_stack", "business_model", "payment_method", "regulatory_status")
   - value: the expected value(s), comma-separated if multiple
   - intent: "qualify" (good fit), "risk" (borderline/needs review), or "exclude" (disqualifier)
   - importance: 1-10 (only for qualify, how important)
   - note: brief context if relevant
4. Personas (buyer roles) — each with name (job title) and description

Return ONLY valid JSON matching this structure:
{
  "name": "string",
  "description": "string",
  "criteria": [{ "group": "string", "category": "string", "value": "string", "intent": "qualify|risk|exclude", "importance": number|null, "note": "string|null" }],
  "personas": [{ "name": "string", "description": "string" }]
}

ICP text:
${text}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Extract JSON from response (might be wrapped in markdown code blocks)
  let jsonStr = content.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonStr.trim()) as ParsedIcp;

  // Validate and normalize
  if (!parsed.name) parsed.name = "Imported ICP";
  if (!parsed.description) parsed.description = "";
  if (!Array.isArray(parsed.criteria)) parsed.criteria = [];
  if (!Array.isArray(parsed.personas)) parsed.personas = [];

  // Normalize criteria
  parsed.criteria = parsed.criteria.map((c) => ({
    group: ["firmographic", "technographic", "behavioral", "compliance", "keyword"].includes(c.group)
      ? c.group
      : "firmographic",
    category: c.category || "unknown",
    value: c.value || "",
    intent: (["qualify", "risk", "exclude"] as const).includes(c.intent) ? c.intent : "qualify",
    importance: c.intent === "qualify" ? (c.importance ?? 5) : undefined,
    note: c.note || undefined,
  }));

  return parsed;
}
