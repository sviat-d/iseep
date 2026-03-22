"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { companies, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { companySchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function createCompany(formData: FormData): Promise<ActionResult & { companyId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name") as string,
    website: (formData.get("website") as string) || undefined,
    country: (formData.get("country") as string) || undefined,
    industry: (formData.get("industry") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = companySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [company] = await db.insert(companies).values({
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    website: parsed.data.website ?? null,
    country: parsed.data.country ?? null,
    industry: parsed.data.industry ?? null,
    notes: parsed.data.notes ?? null,
  }).returning();

  revalidatePath("/deals");
  return { success: true, companyId: company.id };
}

export async function createCompanyPage(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name") as string,
    website: (formData.get("website") as string) || undefined,
    country: (formData.get("country") as string) || undefined,
    industry: (formData.get("industry") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = companySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [company] = await db.insert(companies).values({
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    website: parsed.data.website ?? null,
    country: parsed.data.country ?? null,
    industry: parsed.data.industry ?? null,
    notes: parsed.data.notes ?? null,
  }).returning();

  redirect(`/companies/${company.id}`);
}

export async function updateCompany(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(companies)
    .where(and(eq(companies.id, id), eq(companies.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  await db.update(companies).set({
    name,
    website: (formData.get("website") as string) || null,
    country: (formData.get("country") as string) || null,
    industry: (formData.get("industry") as string) || null,
    notes: (formData.get("notes") as string) || null,
    updatedAt: new Date(),
  }).where(eq(companies.id, id));

  revalidatePath(`/companies/${id}`);
  revalidatePath("/companies");
  return { success: true };
}

export async function deleteCompany(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(companies)
    .where(and(eq(companies.id, id), eq(companies.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  // Null out company refs in deals — set to existing.id keeps the ref (no orphans to worry about with delete cascade)
  // Actually, we need to handle deals that reference this company
  // Since companyId is NOT NULL on deals, we cannot null it. Instead, we'll just delete the company
  // and let the caller handle any FK constraint errors, or we delete contacts first.
  await db.delete(contacts).where(eq(contacts.companyId, id));
  await db.delete(companies).where(eq(companies.id, id));

  revalidatePath("/companies");
  redirect("/companies");
}
