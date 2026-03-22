import { db } from "@/db";
import { valueMappings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkspaceMappings(
  workspaceId: string,
): Promise<Record<string, Record<string, string>>> {
  const rows = await db
    .select()
    .from(valueMappings)
    .where(eq(valueMappings.workspaceId, workspaceId));

  const result: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (!result[row.category]) result[row.category] = {};
    result[row.category][row.fromValue.toLowerCase()] = row.toValue;
  }
  return result;
}

export async function saveMapping(
  workspaceId: string,
  category: string,
  fromValue: string,
  toValue: string,
) {
  // Upsert: insert or update on conflict
  await db
    .insert(valueMappings)
    .values({
      workspaceId,
      category,
      fromValue: fromValue.toLowerCase(),
      toValue,
    })
    .onConflictDoUpdate({
      target: [
        valueMappings.workspaceId,
        valueMappings.category,
        valueMappings.fromValue,
      ],
      set: { toValue },
    });
}

export async function saveMappings(
  workspaceId: string,
  mappings: Record<string, Record<string, string>>,
) {
  for (const [category, catMappings] of Object.entries(mappings)) {
    for (const [from, to] of Object.entries(catMappings)) {
      if (to && to !== "NONE") {
        await saveMapping(workspaceId, category, from, to);
      }
    }
  }
}
