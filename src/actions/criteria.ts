"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { criteria } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { criterionSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function createCriterion(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    group: formData.get("group") as string,
    category: formData.get("category") as string,
    operator: (formData.get("operator") as string) || undefined,
    value: formData.get("value") as string,
    intent: (formData.get("intent") as string) || "qualify",
    weight: formData.get("weight") ? Number(formData.get("weight")) : undefined,
    note: (formData.get("note") as string) || undefined,
    icpId: (formData.get("icpId") as string) || undefined,
    personaId: (formData.get("personaId") as string) || undefined,
  };

  const parsed = criterionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(criteria).values({
    workspaceId: ctx.workspaceId,
    icpId: parsed.data.icpId ?? null,
    personaId: parsed.data.personaId ?? null,
    group: parsed.data.group,
    category: parsed.data.category,
    operator: parsed.data.operator ?? null,
    value: parsed.data.value,
    intent: parsed.data.intent,
    weight: parsed.data.intent === "exclude" ? null : (parsed.data.weight ?? null),
    note: parsed.data.note ?? null,
  });

  if (parsed.data.icpId) revalidatePath(`/icps/${parsed.data.icpId}`);
  revalidatePath("/icps");
  return { success: true };
}

export async function updateCriterion(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(criteria)
    .where(and(eq(criteria.id, id), eq(criteria.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const raw = {
    group: formData.get("group") as string,
    category: formData.get("category") as string,
    operator: (formData.get("operator") as string) || undefined,
    value: formData.get("value") as string,
    intent: (formData.get("intent") as string) || "qualify",
    weight: formData.get("weight") ? Number(formData.get("weight")) : undefined,
    note: (formData.get("note") as string) || undefined,
    icpId: existing.icpId ?? undefined,
    personaId: existing.personaId ?? undefined,
  };

  const parsed = criterionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(criteria)
    .set({
      group: parsed.data.group,
      category: parsed.data.category,
      operator: parsed.data.operator ?? null,
      value: parsed.data.value,
      intent: parsed.data.intent,
      weight: parsed.data.intent === "exclude" ? null : (parsed.data.weight ?? null),
      note: parsed.data.note ?? null,
      updatedAt: new Date(),
    })
    .where(eq(criteria.id, id));

  if (existing.icpId) revalidatePath(`/icps/${existing.icpId}`);
  revalidatePath("/icps");
  return { success: true };
}

export async function deleteCriterion(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(criteria)
    .where(and(eq(criteria.id, id), eq(criteria.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(criteria).where(eq(criteria.id, id));

  if (existing.icpId) revalidatePath(`/icps/${existing.icpId}`);
  revalidatePath("/icps");
  return { success: true };
}
