"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { icps, criteria, personas } from "@/db/schema";
import { getAuthContext } from "@/lib/auth";
import { parseIcpText, type ParsedIcp } from "@/lib/icp-parser";
import type { ActionResult } from "@/lib/types";

export async function parseIcpAction(
  text: string
): Promise<ActionResult & { parsed?: ParsedIcp }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!text.trim()) return { error: "Please paste an ICP description" };

  try {
    const parsed = await parseIcpText(text);
    return { success: true, parsed };
  } catch (e) {
    return {
      error: `Failed to parse: ${e instanceof Error ? e.message : "Unknown error"}`,
    };
  }
}

export async function confirmImportIcp(
  parsed: ParsedIcp
): Promise<ActionResult & { icpId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Create ICP
  const [icp] = await db
    .insert(icps)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.name,
      description: parsed.description || null,
      status: "draft",
      createdBy: ctx.userId,
    })
    .returning();

  // Create criteria
  for (const c of parsed.criteria) {
    await db.insert(criteria).values({
      workspaceId: ctx.workspaceId,
      icpId: icp.id,
      group: c.group as "firmographic" | "technographic" | "behavioral" | "compliance" | "keyword",
      category: c.category,
      operator: "equals",
      value: c.value,
      intent: c.intent as "qualify" | "risk" | "exclude",
      weight: c.intent === "qualify" ? (c.importance ?? 5) : null,
      note: c.note ?? null,
    });
  }

  // Create personas
  for (const p of parsed.personas) {
    await db.insert(personas).values({
      workspaceId: ctx.workspaceId,
      icpId: icp.id,
      name: p.name,
      description: p.description || null,
    });
  }

  revalidatePath("/icps");
  return { success: true, icpId: icp.id };
}
