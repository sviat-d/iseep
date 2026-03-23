import { getAiConfig, callAi } from "@/lib/ai-client";

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

export async function parseIcpText(text: string, workspaceId: string): Promise<ParsedIcp[]> {
  const config = await getAiConfig(workspaceId);

  const prompt = `Parse the following text and extract ALL Ideal Customer Profiles (ICPs) described.

If the text describes ONE ICP, return an array with one element.
If it describes MULTIPLE distinct ICPs (different target segments), return each as a separate element.

For each ICP, extract:
1. name — short label for this ICP
2. description — 1-2 sentence summary
3. criteria — company attributes, each with:
   - group: "firmographic" | "technographic" | "behavioral" | "compliance" | "keyword"
   - category: e.g. "industry", "region", "company_size", "platform", "tech_stack"
   - value: expected value(s), comma-separated if multiple
   - intent: "qualify" (good fit) | "risk" (borderline) | "exclude" (disqualifier)
   - importance: 1-10 (only for qualify)
   - note: brief context if relevant
4. personas — buyer roles, each with name (job title) and description

Return ONLY valid JSON:
{ "icps": [{ "name": "...", "description": "...", "criteria": [...], "personas": [...] }] }

ICP text:
${text}`;

  const responseText = await callAi(config, undefined, prompt, 4000);

  // Extract JSON from response (might be wrapped in markdown code blocks)
  let jsonStr = responseText;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const raw = JSON.parse(jsonStr.trim());

  // Handle both { icps: [...] } and single-object responses for backward compat
  let icps: ParsedIcp[];
  if (raw.icps && Array.isArray(raw.icps)) {
    icps = raw.icps;
  } else if (Array.isArray(raw)) {
    icps = raw;
  } else {
    // Single object response — wrap in array
    icps = [raw as ParsedIcp];
  }

  // Validate and normalize each ICP
  return icps.map((parsed) => {
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
  });
}
