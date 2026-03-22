import Anthropic from "@anthropic-ai/sdk";

export type ValueMapping = Record<string, string>; // csvValue -> icpValue

export async function mapValuesToIcp(
  csvValues: string[],
  icpValues: string[],
  category: string
): Promise<ValueMapping> {
  // If no values to map or no ICP values to map to, return empty
  if (csvValues.length === 0 || icpValues.length === 0) return {};

  // First pass: exact match (case-insensitive) — no AI needed
  const mapping: ValueMapping = {};
  const unmapped: string[] = [];

  for (const csv of csvValues) {
    const exactMatch = icpValues.find(
      (v) => v.toLowerCase().trim() === csv.toLowerCase().trim()
    );
    if (exactMatch) {
      mapping[csv] = exactMatch;
    } else {
      unmapped.push(csv);
    }
  }

  // If everything matched exactly, no AI needed
  if (unmapped.length === 0) return mapping;

  // AI mapping for remaining values
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a data matching assistant. Map CSV values to the closest matching ICP (Ideal Customer Profile) values.

Category: ${category}

CSV values that need mapping:
${unmapped.map((v) => `- "${v}"`).join("\n")}

Available ICP values to map to:
${icpValues.map((v) => `- "${v}"`).join("\n")}

Rules:
- Map each CSV value to the BEST matching ICP value
- If a CSV value is a synonym, abbreviation, or variation of an ICP value, map it
- If no reasonable match exists, map to "NONE"
- Examples: "Financial Technology" → "FinTech", "ecommerce" → "E-commerce", "GB" → "UK"

Return ONLY valid JSON: { "mappings": { "csvValue": "icpValue or NONE" } }`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") return mapping;

  try {
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim()) as {
      mappings: Record<string, string>;
    };

    for (const [csvVal, icpVal] of Object.entries(parsed.mappings)) {
      if (icpVal && icpVal !== "NONE") {
        mapping[csvVal] = icpVal;
      }
    }
  } catch {
    // If AI response parsing fails, just use what we have
  }

  return mapping;
}

// Collect all unique values per category from CSV rows
export function collectUniqueValues(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>
): Record<string, string[]> {
  const valuesByCategory: Record<string, Set<string>> = {};

  for (const row of rows) {
    for (const [csvCol, field] of Object.entries(columnMapping)) {
      if (field && row[csvCol]?.trim()) {
        if (!valuesByCategory[field]) valuesByCategory[field] = new Set();
        valuesByCategory[field].add(row[csvCol].trim());
      }
    }
  }

  const result: Record<string, string[]> = {};
  for (const [field, values] of Object.entries(valuesByCategory)) {
    result[field] = Array.from(values);
  }
  return result;
}

// Collect all unique criterion values per category from ICPs
export function collectIcpValues(
  icpCriteria: Array<{ category: string; value: string }>
): Record<string, string[]> {
  const valuesByCategory: Record<string, Set<string>> = {};

  for (const c of icpCriteria) {
    if (!valuesByCategory[c.category])
      valuesByCategory[c.category] = new Set();
    // Handle comma-separated values
    c.value.split(",").forEach((v) => {
      const trimmed = v.trim();
      if (trimmed) valuesByCategory[c.category].add(trimmed);
    });
  }

  const result: Record<string, string[]> = {};
  for (const [cat, values] of Object.entries(valuesByCategory)) {
    result[cat] = Array.from(values);
  }
  return result;
}
