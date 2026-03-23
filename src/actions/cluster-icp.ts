"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { icps, criteria, personas } from "@/db/schema";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

type DraftCriterion = {
  group: string;
  category: string;
  value: string;
  intent: string;
  importance?: number;
  note?: string;
};

type DraftPersona = {
  name: string;
  description: string;
};

export async function saveClusterAsIcp(
  name: string,
  description: string,
  draftCriteria: DraftCriterion[],
  draftPersonas: DraftPersona[],
): Promise<ActionResult & { icpId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!name.trim()) return { error: "Name is required" };

  const [icp] = await db
    .insert(icps)
    .values({
      workspaceId: ctx.workspaceId,
      name: name.trim(),
      description: description || null,
      status: "draft",
      createdBy: ctx.userId,
    })
    .returning();

  for (const c of draftCriteria) {
    await db.insert(criteria).values({
      workspaceId: ctx.workspaceId,
      icpId: icp.id,
      group: c.group as
        | "firmographic"
        | "technographic"
        | "behavioral"
        | "compliance"
        | "keyword",
      category: c.category,
      operator: "equals",
      value: c.value,
      intent: c.intent as "qualify" | "risk" | "exclude",
      weight: c.intent === "qualify" ? (c.importance ?? 5) : null,
      note: c.note ?? null,
    });
  }

  for (const p of draftPersonas) {
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
