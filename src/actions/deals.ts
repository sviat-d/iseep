"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { deals, dealReasons, meetingNotes, productRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { dealSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function createDeal(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    title: formData.get("title") as string,
    icpId: (formData.get("icpId") as string) || undefined,
    personaId: (formData.get("personaId") as string) || undefined,
    segmentId: (formData.get("segmentId") as string) || undefined,
    companyId: formData.get("companyId") as string,
    contactId: (formData.get("contactId") as string) || undefined,
    dealValue: (formData.get("dealValue") as string) || undefined,
    currency: (formData.get("currency") as string) || undefined,
    stage: (formData.get("stage") as string) || undefined,
    outcome: (formData.get("outcome") as string) || "open",
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = dealSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [deal] = await db.insert(deals).values({
    workspaceId: ctx.workspaceId,
    title: parsed.data.title,
    icpId: parsed.data.icpId ?? null,
    personaId: parsed.data.personaId ?? null,
    segmentId: parsed.data.segmentId ?? null,
    companyId: parsed.data.companyId,
    contactId: parsed.data.contactId ?? null,
    dealValue: parsed.data.dealValue ?? null,
    currency: parsed.data.currency ?? "USD",
    stage: parsed.data.stage ?? "discovery",
    outcome: parsed.data.outcome,
    notes: parsed.data.notes ?? null,
  }).returning();

  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(deals)
    .where(and(eq(deals.id, id), eq(deals.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const raw = {
    title: formData.get("title") as string,
    icpId: (formData.get("icpId") as string) || undefined,
    personaId: (formData.get("personaId") as string) || undefined,
    segmentId: (formData.get("segmentId") as string) || undefined,
    companyId: formData.get("companyId") as string,
    contactId: (formData.get("contactId") as string) || undefined,
    dealValue: (formData.get("dealValue") as string) || undefined,
    currency: (formData.get("currency") as string) || undefined,
    stage: (formData.get("stage") as string) || undefined,
    outcome: (formData.get("outcome") as string) || existing.outcome,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = dealSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.update(deals).set({
    ...parsed.data,
    icpId: parsed.data.icpId ?? null,
    personaId: parsed.data.personaId ?? null,
    segmentId: parsed.data.segmentId ?? null,
    contactId: parsed.data.contactId ?? null,
    dealValue: parsed.data.dealValue ?? null,
    currency: parsed.data.currency ?? "USD",
    stage: parsed.data.stage ?? "discovery",
    notes: parsed.data.notes ?? null,
    closedAt: parsed.data.outcome !== "open" && !existing.closedAt ? new Date() : existing.closedAt,
    updatedAt: new Date(),
  }).where(eq(deals.id, id));

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  return { success: true };
}

export async function deleteDeal(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(deals)
    .where(and(eq(deals.id, id), eq(deals.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(meetingNotes).where(eq(meetingNotes.dealId, id));
  await db.delete(productRequests).where(eq(productRequests.dealId, id));
  await db.delete(dealReasons).where(eq(dealReasons.dealId, id));
  await db.delete(deals).where(eq(deals.id, id));

  revalidatePath("/deals");
  redirect("/deals");
}
