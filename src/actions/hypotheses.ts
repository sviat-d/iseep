"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { hypotheses, icpEvidence } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { hypothesisSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return raw.split(",").filter(Boolean);
  }
}

export async function createHypothesis(
  formData: FormData,
): Promise<ActionResult & { hypothesisId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const selectedCriteriaIds = parseIds(formData.get("selectedCriteriaIds") as string);
  const selectedPersonaIds = parseIds(formData.get("selectedPersonaIds") as string);

  const raw = {
    name: formData.get("name") as string,
    icpId: formData.get("icpId") as string,
    selectedCriteriaIds,
    selectedPersonaIds,
    problem: (formData.get("problem") as string) || undefined,
    solution: (formData.get("solution") as string) || undefined,
    outcome: (formData.get("outcome") as string) || undefined,
    status: (formData.get("status") as string) || "draft",
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = hypothesisSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(hypotheses)
    .values({
      workspaceId: ctx.workspaceId,
      icpId: parsed.data.icpId,
      name: parsed.data.name,
      selectedCriteriaIds: parsed.data.selectedCriteriaIds ?? [],
      selectedPersonaIds: parsed.data.selectedPersonaIds ?? [],
      problem: parsed.data.problem ?? null,
      solution: parsed.data.solution ?? null,
      outcome: parsed.data.outcome ?? null,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: hypotheses.id });

  revalidatePath(`/icps/${parsed.data.icpId}`);
  return { success: true, hypothesisId: created.id };
}

export async function updateHypothesis(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(hypotheses)
    .where(and(eq(hypotheses.id, id), eq(hypotheses.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const selectedCriteriaIds = parseIds(formData.get("selectedCriteriaIds") as string);
  const selectedPersonaIds = parseIds(formData.get("selectedPersonaIds") as string);

  const raw = {
    name: formData.get("name") as string,
    icpId: existing.icpId,
    selectedCriteriaIds,
    selectedPersonaIds,
    problem: (formData.get("problem") as string) || undefined,
    solution: (formData.get("solution") as string) || undefined,
    outcome: (formData.get("outcome") as string) || undefined,
    status: (formData.get("status") as string) || existing.status,
    notes: (formData.get("notes") as string) || undefined,
    metricsLeads: (formData.get("metricsLeads") as string) || undefined,
    metricsReplies: (formData.get("metricsReplies") as string) || undefined,
    metricsMeetings: (formData.get("metricsMeetings") as string) || undefined,
    metricsOpps: (formData.get("metricsOpps") as string) || undefined,
    metricsWins: (formData.get("metricsWins") as string) || undefined,
  };

  const parsed = hypothesisSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(hypotheses)
    .set({
      name: parsed.data.name,
      selectedCriteriaIds: parsed.data.selectedCriteriaIds ?? [],
      selectedPersonaIds: parsed.data.selectedPersonaIds ?? [],
      problem: parsed.data.problem ?? null,
      solution: parsed.data.solution ?? null,
      outcome: parsed.data.outcome ?? null,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      metricsLeads: parsed.data.metricsLeads ?? 0,
      metricsReplies: parsed.data.metricsReplies ?? 0,
      metricsMeetings: parsed.data.metricsMeetings ?? 0,
      metricsOpps: parsed.data.metricsOpps ?? 0,
      metricsWins: parsed.data.metricsWins ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(hypotheses.id, id));

  revalidatePath(`/icps/${existing.icpId}`);
  return { success: true };
}

export async function deleteHypothesis(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(hypotheses)
    .where(and(eq(hypotheses.id, id), eq(hypotheses.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db
    .update(icpEvidence)
    .set({ hypothesisId: null })
    .where(eq(icpEvidence.hypothesisId, id));

  await db.delete(hypotheses).where(eq(hypotheses.id, id));

  revalidatePath(`/icps/${existing.icpId}`);
  return { success: true };
}

export async function getHypothesesForIcp(icpId: string, workspaceId: string) {
  return db
    .select()
    .from(hypotheses)
    .where(and(eq(hypotheses.icpId, icpId), eq(hypotheses.workspaceId, workspaceId)))
    .orderBy(hypotheses.createdAt);
}
