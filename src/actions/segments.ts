"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { segments, deals, productRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { segmentSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function createSegment(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    icpId: formData.get("icpId") as string,
    status: (formData.get("status") as string) || "draft",
    priorityScore: Number(formData.get("priorityScore") || 5),
  };

  const parsed = segmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [segment] = await db
    .insert(segments)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      icpId: parsed.data.icpId,
      status: parsed.data.status,
      priorityScore: parsed.data.priorityScore,
      logicJson: { rules: [] },
    })
    .returning();

  redirect(`/segments/${segment.id}`);
}

export async function updateSegment(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(segments)
    .where(and(eq(segments.id, id), eq(segments.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;
  const status = formData.get("status") as string | null;
  const priorityScore = formData.get("priorityScore");
  const logicJsonStr = formData.get("logicJson") as string | null;

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (name) updates.name = name;
  if (description !== null) updates.description = description || null;
  if (status) updates.status = status;
  if (priorityScore) updates.priorityScore = Number(priorityScore);
  if (logicJsonStr) {
    try {
      updates.logicJson = JSON.parse(logicJsonStr);
    } catch {
      return { error: "Invalid condition structure" };
    }
  }

  await db.update(segments).set(updates).where(eq(segments.id, id));

  revalidatePath(`/segments/${id}`);
  revalidatePath("/segments");
  revalidatePath(`/icps/${existing.icpId}`);
  return { success: true };
}

export async function deleteSegment(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(segments)
    .where(and(eq(segments.id, id), eq(segments.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  // Null out FK refs
  await db.update(deals).set({ segmentId: null }).where(eq(deals.segmentId, id));
  await db.update(productRequests).set({ segmentId: null }).where(eq(productRequests.segmentId, id));

  await db.delete(segments).where(eq(segments.id, id));

  revalidatePath("/segments");
  revalidatePath(`/icps/${existing.icpId}`);
  redirect("/segments");
}
