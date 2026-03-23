import type { ParsedIcp } from "@/lib/icp-parser";

type Lead = {
  companyName: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  rawData: Record<string, unknown>;
};

export type ClusterDraft = {
  suggestedName: string;
  description: string;
  whySuggested: string;
  confidence: "high" | "medium" | "low";
  exampleCompanies: Array<{
    name: string;
    country: string | null;
    website: string | null;
  }>;
  criteria: Array<{
    group: string;
    category: string;
    value: string;
    intent: "qualify" | "risk" | "exclude";
    importance?: number;
    note?: string;
  }>;
  personas: Array<{ name: string; description: string }>;
};

function mode<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const freq = new Map<T, number>();
  for (const item of arr) {
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  let maxCount = 0;
  let maxItem: T | null = null;
  for (const [item, count] of freq) {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  }
  return maxItem;
}

function uniqueNonNull(arr: (string | null | undefined)[]): string[] {
  return [...new Set(arr.filter((v): v is string => Boolean(v?.trim())))];
}

export function generateClusterDraft(
  industry: string,
  leads: Lead[],
  existingIcpNames: string[],
): ClusterDraft {
  // Extract data from leads
  const companies = leads.map((l) => ({
    name: l.companyName ?? "Unknown",
    country: l.country,
    website: l.website,
  }));

  const countries = uniqueNonNull(leads.map((l) => l.country));
  const titles = uniqueNonNull(
    leads.map((l) => {
      const raw = l.rawData as Record<string, string>;
      return raw.contact_title ?? raw.title ?? null;
    }),
  );

  // Generate suggested name
  let suggestedName = `${industry} Companies`;
  if (industry.endsWith("s")) suggestedName = industry;
  // Avoid duplicate names
  let nameIdx = 1;
  let finalName = suggestedName;
  while (existingIcpNames.includes(finalName)) {
    nameIdx++;
    finalName = `${suggestedName} ${nameIdx}`;
  }

  // Generate description
  const countryStr =
    countries.length > 0
      ? countries.slice(0, 3).join(", ")
      : "various regions";
  const description = `Companies in the ${industry} space, primarily operating in ${countryStr}. Found as a cluster of ${leads.length} unmatched leads from scoring.`;

  // Why suggested
  const whySuggested = `${leads.length} companies in your lead list share the "${industry}" industry but don't match any of your current ICPs. This suggests a potential new market segment worth exploring.`;

  // Confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (leads.length >= 5) confidence = "high";
  else if (leads.length >= 3) confidence = "medium";

  // Build criteria
  const draftCriteria: ClusterDraft["criteria"] = [];

  // Industry criterion
  draftCriteria.push({
    group: "firmographic",
    category: "industry",
    value: industry,
    intent: "qualify",
    importance: 9,
    note: `Core industry for this ICP -- found in ${leads.length} leads`,
  });

  // Region criteria (if there's a dominant region)
  if (countries.length > 0) {
    const topCountry = mode(
      leads.map((l) => l.country).filter(Boolean) as string[],
    );
    if (topCountry) {
      draftCriteria.push({
        group: "firmographic",
        category: "region",
        value: countries.join(", "),
        intent: "qualify",
        importance: 6,
        note: "Most common regions in this cluster",
      });
    }
  }

  // Company size if available in raw data
  const sizes = leads
    .map((l) => (l.rawData as Record<string, string>).company_size)
    .filter(Boolean);
  if (sizes.length > 0) {
    const avgSize = sizes.map(Number).filter((n) => !isNaN(n));
    if (avgSize.length > 0) {
      const min = Math.min(...avgSize);
      const max = Math.max(...avgSize);
      draftCriteria.push({
        group: "firmographic",
        category: "company_size",
        value: min === max ? `${min}` : `${min}-${max}`,
        intent: "qualify",
        importance: 4,
      });
    }
  }

  // Personas from contact titles
  const draftPersonas: ClusterDraft["personas"] = [];
  const uniqueTitles = [...new Set(titles)].slice(0, 3);
  for (const title of uniqueTitles) {
    draftPersonas.push({
      name: title,
      description: `Key contact found in ${industry} companies`,
    });
  }
  // Default persona if none found
  if (draftPersonas.length === 0) {
    draftPersonas.push({
      name: "Decision Maker",
      description: `Primary buyer persona for ${industry} companies`,
    });
  }

  return {
    suggestedName: finalName,
    description,
    whySuggested,
    confidence,
    exampleCompanies: companies.slice(0, 5),
    criteria: draftCriteria,
    personas: draftPersonas,
  };
}
