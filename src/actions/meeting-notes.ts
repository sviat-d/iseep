"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { meetingNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { meetingNoteSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function createMeetingNote(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    dealId: (formData.get("dealId") as string) || undefined,
    companyId: (formData.get("companyId") as string) || undefined,
    summary: formData.get("summary") as string,
    sourceType: (formData.get("sourceType") as string) || "manual",
  };

  const parsed = meetingNoteSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(meetingNotes).values({
    workspaceId: ctx.workspaceId,
    dealId: parsed.data.dealId ?? null,
    companyId: parsed.data.companyId ?? null,
    summary: parsed.data.summary,
    sourceType: parsed.data.sourceType,
  });

  if (parsed.data.dealId) revalidatePath(`/deals/${parsed.data.dealId}`);
  return { success: true };
}

export async function deleteMeetingNote(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(meetingNotes)
    .where(and(eq(meetingNotes.id, id), eq(meetingNotes.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(meetingNotes).where(eq(meetingNotes.id, id));
  if (existing.dealId) revalidatePath(`/deals/${existing.dealId}`);
  return { success: true };
}
