"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { personas, criteria } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { personaSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function createPersona(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    icpId: formData.get("icpId") as string,
  };

  const parsed = personaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(personas).values({
    workspaceId: ctx.workspaceId,
    icpId: parsed.data.icpId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
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
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    icpId: existing.icpId,
  };

  const parsed = personaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(personas)
    .set({ name: parsed.data.name, description: parsed.data.description ?? null, updatedAt: new Date() })
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
