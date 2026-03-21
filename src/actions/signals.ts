"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function createSignal(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const type = formData.get("type") as string;
  const label = formData.get("label") as string;
  const description = (formData.get("description") as string) || null;
  const strength = formData.get("strength") ? Number(formData.get("strength")) : null;
  const icpId = (formData.get("icpId") as string) || null;

  if (!type || !label) return { error: "Type and label are required" };

  await db.insert(signals).values({
    workspaceId: ctx.workspaceId,
    icpId,
    type,
    label,
    description,
    strength,
  });

  if (icpId) revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function updateSignal(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(signals)
    .where(and(eq(signals.id, id), eq(signals.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.update(signals).set({
    type: formData.get("type") as string,
    label: formData.get("label") as string,
    description: (formData.get("description") as string) || null,
    strength: formData.get("strength") ? Number(formData.get("strength")) : null,
    updatedAt: new Date(),
  }).where(eq(signals.id, id));

  if (existing.icpId) revalidatePath(`/icps/${existing.icpId}`);
  return { success: true };
}

export async function deleteSignal(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(signals)
    .where(and(eq(signals.id, id), eq(signals.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(signals).where(eq(signals.id, id));

  if (existing.icpId) revalidatePath(`/icps/${existing.icpId}`);
  return { success: true };
}
