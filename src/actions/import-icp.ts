"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { icps, criteria, personas } from "@/db/schema";
import { getAuthContext } from "@/lib/auth";
import { parseIcpText, type ParsedIcp } from "@/lib/icp-parser";
import { checkAiLimit, trackAiUsage, getMonthlyUsage } from "@/lib/ai-usage";
import type { ActionResult } from "@/lib/types";

export async function parseIcpAction(
  text: string
): Promise<ActionResult & { parsed?: ParsedIcp[] }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Please sign in to continue" };

  if (!text.trim()) return { error: "Please paste an ICP description" };

  // Check limit
  const limit = await checkAiLimit(ctx.workspaceId);
  if (!limit.allowed) {
    return { error: `Monthly AI limit reached (${limit.used}/${limit.limit}). Limit resets on the 1st of each month.` };
  }

  try {
    const parsed = await parseIcpText(text);
    await trackAiUsage(ctx.workspaceId, ctx.userId, "icp_parse");
    return { success: true, parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";

    // Friendly error messages
    if (msg.includes("credit balance") || msg.includes("billing")) {
      return { error: "AI service temporarily unavailable. Please try again later or create your ICP manually." };
    }
    if (msg.includes("rate_limit")) {
      return { error: "Too many requests. Please wait a moment and try again." };
    }
    if (msg.includes("JSON")) {
      return { error: "Could not extract structured data from this text. Try adding more detail about industry, region, or company type." };
    }
    return { error: "Something went wrong. Please try again or create your ICP manually." };
  }
}

export async function confirmImportIcps(
  icps_: ParsedIcp[]
): Promise<ActionResult & { icpIds?: string[] }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Please sign in to continue" };

  const icpIds: string[] = [];

  for (const parsed of icps_) {
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

    icpIds.push(icp.id);

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

    for (const p of parsed.personas) {
      await db.insert(personas).values({
        workspaceId: ctx.workspaceId,
        icpId: icp.id,
        name: p.name,
        description: p.description || null,
      });
    }
  }

  revalidatePath("/icps");
  return { success: true, icpIds };
}

export async function getImportUsage(): Promise<{ used: number; limit: number } | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  return getMonthlyUsage(ctx.workspaceId);
}
