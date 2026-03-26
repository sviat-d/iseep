"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { icpEvidence } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ActionResult } from "@/lib/types";

export async function addEvidence(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const icpId = formData.get("icpId") as string;
  const companyName = (formData.get("companyName") as string)?.trim();
  const outcome = formData.get("outcome") as string;
  const note = (formData.get("note") as string)?.trim() || null;
  const industry = (formData.get("industry") as string)?.trim() || null;
  const region = (formData.get("region") as string)?.trim() || null;
  const dateStr = formData.get("date") as string;
  const tagsRaw = formData.get("reasonTags") as string;

  if (!icpId || !companyName || !outcome) {
    return { error: "Company name and outcome are required" };
  }

  if (outcome !== "won" && outcome !== "lost") {
    return { error: "Outcome must be won or lost" };
  }

  const reasonTags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  await db.insert(icpEvidence).values({
    workspaceId: ctx.workspaceId,
    icpId,
    companyName,
    outcome,
    reasonTags,
    note,
    industry,
    region,
    date: dateStr ? new Date(dateStr) : null,
  });

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function deleteEvidence(evidenceId: string, icpId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .delete(icpEvidence)
    .where(
      and(eq(icpEvidence.id, evidenceId), eq(icpEvidence.workspaceId, ctx.workspaceId))
    );

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function getEvidenceForIcp(icpId: string, workspaceId: string) {
  return db
    .select()
    .from(icpEvidence)
    .where(
      and(eq(icpEvidence.icpId, icpId), eq(icpEvidence.workspaceId, workspaceId))
    )
    .orderBy(icpEvidence.createdAt);
}
