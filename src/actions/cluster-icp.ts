"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { icps, criteria, personas, scoredLeads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
  uploadId?: string,
  clusterIndustry?: string,
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

  // Reclassify unmatched leads from this cluster as "adopted"
  if (uploadId && clusterIndustry) {
    const clusterLeads = await db
      .select()
      .from(scoredLeads)
      .where(and(
        eq(scoredLeads.uploadId, uploadId),
        eq(scoredLeads.fitLevel, "none"),
      ));

    const matchingLeads = clusterLeads.filter(
      (l) => l.industry?.toLowerCase() === clusterIndustry.toLowerCase()
    );

    for (const lead of matchingLeads) {
      await db
        .update(scoredLeads)
        .set({
          bestIcpId: icp.id,
          bestIcpName: icp.name,
          fitLevel: "high",
          fitScore: 80,
          confidence: 90,
          matchReasons: [
            ...(Array.isArray(lead.matchReasons) ? lead.matchReasons as Record<string, unknown>[] : []),
            {
              category: "transfer",
              criterionValue: clusterIndustry,
              intent: "qualify",
              matched: true,
              matchType: "adopted",
              weight: 10,
              leadValue: lead.industry,
              note: `Adopted from unmatched cluster → ${icp.name}`,
            },
          ],
        })
        .where(eq(scoredLeads.id, lead.id));
    }
  }

  revalidatePath("/icps");
  if (uploadId) revalidatePath(`/scoring/${uploadId}`);
  return { success: true, icpId: icp.id };
}
