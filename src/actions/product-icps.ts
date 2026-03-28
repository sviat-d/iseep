"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { productIcps, icps, criteria, personas, signals } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { ActionResult } from "@/lib/types";

/** Link an existing ICP to a product (many-to-many) */
export async function linkIcpToProduct(icpId: string, productId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Check ICP exists in workspace
  const [icp] = await db.select({ id: icps.id }).from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ctx.workspaceId)));
  if (!icp) return { error: "ICP not found" };

  // Check if already linked
  const [existing] = await db.select({ id: productIcps.id }).from(productIcps)
    .where(and(eq(productIcps.productId, productId), eq(productIcps.icpId, icpId)));
  if (existing) return { success: true }; // already linked

  await db.insert(productIcps).values({
    workspaceId: ctx.workspaceId,
    productId,
    icpId,
  });

  revalidatePath("/icps");
  return { success: true };
}

/** Unlink an ICP from a product */
export async function unlinkIcpFromProduct(icpId: string, productId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db.delete(productIcps).where(
    and(eq(productIcps.productId, productId), eq(productIcps.icpId, icpId), eq(productIcps.workspaceId, ctx.workspaceId))
  );

  revalidatePath("/icps");
  return { success: true };
}

/** Bulk update product attachments for an ICP */
export async function updateIcpProducts(
  icpId: string,
  selectedProductIds: string[],
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (selectedProductIds.length === 0) {
    return { error: "An ICP must remain attached to at least one product." };
  }

  // Verify ICP belongs to workspace
  const [icp] = await db
    .select({ id: icps.id })
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ctx.workspaceId)));
  if (!icp) return { error: "ICP not found" };

  // Get current links
  const currentLinks = await db
    .select({ productId: productIcps.productId })
    .from(productIcps)
    .where(and(eq(productIcps.icpId, icpId), eq(productIcps.workspaceId, ctx.workspaceId)));

  const currentIds = new Set(currentLinks.map((l) => l.productId));
  const targetIds = new Set(selectedProductIds);

  // Products to add
  const toAdd = selectedProductIds.filter((id) => !currentIds.has(id));
  // Products to remove
  const toRemove = currentLinks
    .map((l) => l.productId)
    .filter((id) => !targetIds.has(id));

  if (toAdd.length > 0) {
    await db.insert(productIcps).values(
      toAdd.map((productId) => ({
        workspaceId: ctx.workspaceId,
        productId,
        icpId,
      })),
    );
  }

  if (toRemove.length > 0) {
    for (const productId of toRemove) {
      await db
        .delete(productIcps)
        .where(
          and(
            eq(productIcps.productId, productId),
            eq(productIcps.icpId, icpId),
            eq(productIcps.workspaceId, ctx.workspaceId),
          ),
        );
    }
  }

  revalidatePath(`/icps/${icpId}`);
  revalidatePath("/icps");
  return { success: true };
}

/** Duplicate an ICP and link the copy to a specific product */
export async function duplicateIcpForProduct(icpId: string, productId: string): Promise<ActionResult & { newIcpId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Load original ICP with criteria, personas, signals
  const [original] = await db.select().from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ctx.workspaceId)));
  if (!original) return { error: "ICP not found" };

  const origCriteria = await db.select().from(criteria).where(eq(criteria.icpId, icpId));
  const origPersonas = await db.select().from(personas).where(eq(personas.icpId, icpId));
  const origSignals = await db.select().from(signals).where(eq(signals.icpId, icpId));

  // Create copy
  const [newIcp] = await db.insert(icps).values({
    workspaceId: ctx.workspaceId,
    name: `${original.name} (copy)`,
    description: original.description,
    status: original.status,
    createdBy: ctx.userId,
  }).returning({ id: icps.id });

  // Copy criteria
  if (origCriteria.length > 0) {
    await db.insert(criteria).values(
      origCriteria.map((c) => ({
        workspaceId: ctx.workspaceId,
        icpId: newIcp.id,
        group: c.group,
        category: c.category,
        operator: c.operator,
        value: c.value,
        intent: c.intent,
        weight: c.weight,
        note: c.note,
      }))
    );
  }

  // Copy personas
  if (origPersonas.length > 0) {
    await db.insert(personas).values(
      origPersonas.map((p) => ({
        workspaceId: ctx.workspaceId,
        icpId: newIcp.id,
        name: p.name,
        description: p.description,
      }))
    );
  }

  // Copy signals
  if (origSignals.length > 0) {
    await db.insert(signals).values(
      origSignals.map((s) => ({
        workspaceId: ctx.workspaceId,
        icpId: newIcp.id,
        type: s.type,
        label: s.label,
        description: s.description,
        strength: s.strength,
      }))
    );
  }

  // Link to product
  await db.insert(productIcps).values({
    workspaceId: ctx.workspaceId,
    productId,
    icpId: newIcp.id,
  });

  revalidatePath("/icps");
  return { success: true, newIcpId: newIcp.id };
}
