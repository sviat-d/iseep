"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/types";

export async function updateCompanyInfo(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Company name is required" };

  const website = (formData.get("website") as string)?.trim() || null;
  const companyDescription = (formData.get("companyDescription") as string)?.trim() || null;
  const targetCustomers = (formData.get("targetCustomers") as string)?.trim() || null;
  const industriesRaw = (formData.get("industriesFocus") as string) || "";
  const geoRaw = (formData.get("geoFocus") as string) || "";

  const industriesFocus = industriesRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const geoFocus = geoRaw.split(",").map((s) => s.trim()).filter(Boolean);

  await db
    .update(workspaces)
    .set({
      name,
      website,
      companyDescription,
      targetCustomers,
      industriesFocus,
      geoFocus,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/icps");
  revalidatePath("/settings/product");
  return { success: true };
}
