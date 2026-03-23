"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { productContext } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function saveProductContext(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const productDescription = formData.get("productDescription") as string;
  if (!productDescription?.trim()) return { error: "Product description is required" };

  const data = {
    workspaceId: ctx.workspaceId,
    companyName: (formData.get("companyName") as string) || null,
    website: (formData.get("website") as string) || null,
    productDescription: productDescription.trim(),
    targetCustomers: (formData.get("targetCustomers") as string) || null,
    coreUseCases: parseJsonArray(formData.get("coreUseCases") as string),
    keyValueProps: parseJsonArray(formData.get("keyValueProps") as string),
    industriesFocus: parseJsonArray(formData.get("industriesFocus") as string),
    geoFocus: parseJsonArray(formData.get("geoFocus") as string),
    pricingModel: (formData.get("pricingModel") as string) || null,
    avgTicket: (formData.get("avgTicket") as string) || null,
    updatedAt: new Date(),
  };

  // Upsert — one per workspace
  const [existing] = await db
    .select({ id: productContext.id })
    .from(productContext)
    .where(eq(productContext.workspaceId, ctx.workspaceId));

  if (existing) {
    await db.update(productContext).set(data).where(eq(productContext.id, existing.id));
  } else {
    await db.insert(productContext).values(data);
  }

  revalidatePath("/settings/product");
  revalidatePath("/dashboard");
  revalidatePath("/scoring");
  return { success: true };
}

function parseJsonArray(value: string | null): string[] {
  if (!value?.trim()) return [];
  // Accept comma-separated or JSON array
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON, treat as comma-separated
  }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}
