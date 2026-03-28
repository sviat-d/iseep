"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { products, icps, icpEvidence, criteria, personas, signals, segments } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { ActionResult } from "@/lib/types";

export async function createProduct(formData: FormData): Promise<ActionResult & { productId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  const shortDescription = (formData.get("shortDescription") as string)?.trim() || null;

  if (!name) return { error: "Product name is required" };

  const [product] = await db.insert(products).values({
    workspaceId: ctx.workspaceId,
    name,
    shortDescription,
  }).returning({ id: products.id });

  revalidatePath("/icps");
  return { success: true, productId: product.id };
}

export async function updateProductFull(productId: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Product name is required" };

  const shortDescription = (formData.get("shortDescription") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const coreUseCases = parseList(formData.get("coreUseCases") as string);
  const keyValueProps = parseList(formData.get("keyValueProps") as string);
  const pricingModel = (formData.get("pricingModel") as string)?.trim() || null;
  const avgTicket = (formData.get("avgTicket") as string)?.trim() || null;

  await db
    .update(products)
    .set({ name, shortDescription, description, coreUseCases, keyValueProps, pricingModel, avgTicket, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.workspaceId, ctx.workspaceId)));

  revalidatePath("/icps");
  return { success: true };
}

function parseList(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Get all ICPs for this product
  const productIcps = await db
    .select({ id: icps.id })
    .from(icps)
    .where(and(eq(icps.productId, productId), eq(icps.workspaceId, ctx.workspaceId)));

  const icpIds = productIcps.map((i) => i.id);

  if (icpIds.length > 0) {
    // Delete related data for these ICPs
    await db.delete(icpEvidence).where(inArray(icpEvidence.icpId, icpIds));
    await db.delete(criteria).where(inArray(criteria.icpId, icpIds));
    await db.delete(personas).where(inArray(personas.icpId, icpIds));
    await db.delete(signals).where(inArray(signals.icpId, icpIds));
    await db.delete(segments).where(inArray(segments.icpId, icpIds));
    await db.delete(icps).where(inArray(icps.id, icpIds));
  }

  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.workspaceId, ctx.workspaceId)));

  revalidatePath("/icps");
  return { success: true };
}

export async function getProducts(workspaceId: string) {
  return db
    .select()
    .from(products)
    .where(eq(products.workspaceId, workspaceId))
    .orderBy(products.createdAt);
}
