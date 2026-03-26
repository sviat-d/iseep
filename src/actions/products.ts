"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

export async function updateProduct(productId: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  const shortDescription = (formData.get("shortDescription") as string)?.trim() || null;

  if (!name) return { error: "Product name is required" };

  await db
    .update(products)
    .set({ name, shortDescription, updatedAt: new Date() })
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
