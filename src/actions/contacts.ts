"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function createContact(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const fullName = formData.get("fullName") as string;
  const companyId = formData.get("companyId") as string;
  if (!fullName || !companyId) return { error: "Name and company are required" };

  await db.insert(contacts).values({
    workspaceId: ctx.workspaceId,
    companyId,
    fullName,
    title: (formData.get("title") as string) || null,
    email: (formData.get("email") as string) || null,
    linkedinUrl: (formData.get("linkedinUrl") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath(`/companies/${companyId}`);
  return { success: true };
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(contacts).where(eq(contacts.id, id));
  revalidatePath(`/companies/${existing.companyId}`);
  return { success: true };
}
