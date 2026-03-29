"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { hypotheses, icpEvidence, productIcps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { hypothesisSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

async function validateProductSubset(icpId: string, workspaceId: string, productIds: string[]): Promise<string | null> {
  if (productIds.length === 0) return null;
  const links = await db
    .select({ productId: productIcps.productId })
    .from(productIcps)
    .where(and(eq(productIcps.icpId, icpId), eq(productIcps.workspaceId, workspaceId)));
  const allowed = new Set(links.map((l) => l.productId));
  const invalid = productIds.filter((id) => !allowed.has(id));
  if (invalid.length > 0) return "Selected products must belong to this ICP.";
  return null;
}

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
  const selectedSignalIds = parseIds(formData.get("selectedSignalIds") as string);
  const productIds = parseIds(formData.get("productIds") as string);

  const raw = {
    name: formData.get("name") as string,
    icpId: formData.get("icpId") as string,
    selectedCriteriaIds,
    selectedPersonaIds,
    selectedSignalIds,
    problem: (formData.get("problem") as string) || undefined,
    solution: (formData.get("solution") as string) || undefined,
    outcome: (formData.get("outcome") as string) || undefined,
    status: (formData.get("status") as string) || "draft",
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = hypothesisSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Server-side: hypothesis.productIds ⊆ icp.productIds
  const subsetError = await validateProductSubset(parsed.data.icpId, ctx.workspaceId, productIds);
  if (subsetError) return { error: subsetError };

  const [created] = await db
    .insert(hypotheses)
    .values({
      workspaceId: ctx.workspaceId,
      icpId: parsed.data.icpId,
      name: parsed.data.name,
      selectedCriteriaIds: parsed.data.selectedCriteriaIds ?? [],
      selectedPersonaIds: parsed.data.selectedPersonaIds ?? [],
      selectedSignalIds: parsed.data.selectedSignalIds ?? [],
      productIds,
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
  const selectedSignalIds = parseIds(formData.get("selectedSignalIds") as string);
  const productIds = parseIds(formData.get("productIds") as string);

  const raw = {
    name: formData.get("name") as string,
    icpId: existing.icpId,
    selectedCriteriaIds,
    selectedPersonaIds,
    selectedSignalIds,
    problem: (formData.get("problem") as string) || undefined,
    solution: (formData.get("solution") as string) || undefined,
    outcome: (formData.get("outcome") as string) || undefined,
    status: (formData.get("status") as string) || existing.status,
    notes: (formData.get("notes") as string) || undefined,
    recipients: (formData.get("recipients") as string) || undefined,
    positiveReplies: (formData.get("positiveReplies") as string) || undefined,
    sqls: (formData.get("sqls") as string) || undefined,
    wonDeals: (formData.get("wonDeals") as string) || undefined,
    lostDeals: (formData.get("lostDeals") as string) || undefined,
  };

  const parsed = hypothesisSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Server-side: hypothesis.productIds ⊆ icp.productIds
  const subsetError = await validateProductSubset(existing.icpId, ctx.workspaceId, productIds);
  if (subsetError) return { error: subsetError };

  await db
    .update(hypotheses)
    .set({
      name: parsed.data.name,
      selectedCriteriaIds: parsed.data.selectedCriteriaIds ?? [],
      selectedPersonaIds: parsed.data.selectedPersonaIds ?? [],
      selectedSignalIds: parsed.data.selectedSignalIds ?? [],
      productIds,
      problem: parsed.data.problem ?? null,
      solution: parsed.data.solution ?? null,
      outcome: parsed.data.outcome ?? null,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      recipients: parsed.data.recipients ?? 0,
      positiveReplies: parsed.data.positiveReplies ?? 0,
      sqls: parsed.data.sqls ?? 0,
      wonDeals: parsed.data.wonDeals ?? 0,
      lostDeals: parsed.data.lostDeals ?? 0,
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
