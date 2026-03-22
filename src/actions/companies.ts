"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies } from "@/db/schema";
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
