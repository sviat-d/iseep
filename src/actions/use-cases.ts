"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { productUseCases, icpEvidence } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ActionResult } from "@/lib/types";

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getUseCasesForProduct(productId: string, workspaceId: string) {
  return db
    .select()
    .from(productUseCases)
    .where(and(eq(productUseCases.productId, productId), eq(productUseCases.workspaceId, workspaceId)))
    .orderBy(productUseCases.name);
}

export async function createUseCase(
  productId: string,
  name: string,
): Promise<ActionResult & { useCaseId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Use case name is required" };

  const normalized = normalize(trimmed);

  // Check duplicate
  const [existing] = await db
    .select({ id: productUseCases.id })
    .from(productUseCases)
    .where(and(eq(productUseCases.productId, productId), eq(productUseCases.normalizedName, normalized)));

  if (existing) return { success: true, useCaseId: existing.id }; // return existing

  const [created] = await db.insert(productUseCases).values({
    productId,
    workspaceId: ctx.workspaceId,
    name: trimmed,
    normalizedName: normalized,
  }).returning({ id: productUseCases.id });

  revalidatePath("/icps");
  return { success: true, useCaseId: created.id };
}

export async function deleteUseCase(useCaseId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Check if in use
  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(icpEvidence)
    .where(eq(icpEvidence.useCaseId, useCaseId));

  if (usage && usage.count > 0) {
    return { error: `This use case is used in ${usage.count} case${usage.count === 1 ? "" : "s"}. Remove it from cases first.` };
  }

  await db
    .delete(productUseCases)
    .where(and(eq(productUseCases.id, useCaseId), eq(productUseCases.workspaceId, ctx.workspaceId)));

  revalidatePath("/icps");
  return { success: true };
}
