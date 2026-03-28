"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { personas, criteria } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { personaSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

function extractPersonaFields(formData: FormData) {
  return {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    goals: (formData.get("goals") as string) || undefined,
    painPoints: (formData.get("painPoints") as string) || undefined,
    triggers: (formData.get("triggers") as string) || undefined,
    decisionCriteria: (formData.get("decisionCriteria") as string) || undefined,
    objections: (formData.get("objections") as string) || undefined,
    desiredOutcome: (formData.get("desiredOutcome") as string) || undefined,
  };
}

export async function createPersona(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    ...extractPersonaFields(formData),
    icpId: formData.get("icpId") as string,
  };

  const parsed = personaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(personas).values({
    workspaceId: ctx.workspaceId,
    icpId: parsed.data.icpId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    goals: parsed.data.goals ?? null,
    painPoints: parsed.data.painPoints ?? null,
    triggers: parsed.data.triggers ?? null,
    decisionCriteria: parsed.data.decisionCriteria ?? null,
    objections: parsed.data.objections ?? null,
    desiredOutcome: parsed.data.desiredOutcome ?? null,
  });

  revalidatePath(`/icps/${parsed.data.icpId}`);
  return { success: true };
}

export async function updatePersona(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const raw = {
    ...extractPersonaFields(formData),
    icpId: existing.icpId,
  };

  const parsed = personaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(personas)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      goals: parsed.data.goals ?? null,
      painPoints: parsed.data.painPoints ?? null,
      triggers: parsed.data.triggers ?? null,
      decisionCriteria: parsed.data.decisionCriteria ?? null,
      objections: parsed.data.objections ?? null,
      desiredOutcome: parsed.data.desiredOutcome ?? null,
      updatedAt: new Date(),
    })
    .where(eq(personas.id, id));

  revalidatePath(`/icps/${existing.icpId}`);
  return { success: true };
}

export async function deletePersona(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(criteria).where(eq(criteria.personaId, id));
  await db.delete(personas).where(eq(personas.id, id));

  revalidatePath(`/icps/${existing.icpId}`);
  return { success: true };
}
