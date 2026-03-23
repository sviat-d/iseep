"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { rejectedIcps, productContext } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function rejectSuggestedIcp(
  industry: string,
  reason: string,
  details?: string
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Save rejection
  await db.insert(rejectedIcps).values({
    workspaceId: ctx.workspaceId,
    industry,
    reason,
    details: details ?? null,
  });

  // Also add to excluded industries in product context
  const [existing] = await db
    .select()
    .from(productContext)
    .where(eq(productContext.workspaceId, ctx.workspaceId));

  if (existing) {
    const currentExcluded = (existing.excludedIndustries as string[] | null) ?? [];
    if (!currentExcluded.map(s => s.toLowerCase()).includes(industry.toLowerCase())) {
      await db.update(productContext).set({
        excludedIndustries: [...currentExcluded, industry],
        updatedAt: new Date(),
      }).where(eq(productContext.id, existing.id));
    }
  }

  revalidatePath("/scoring");
  return { success: true };
}

export async function getRejectedIcps(workspaceId: string) {
  return db
    .select()
    .from(rejectedIcps)
    .where(eq(rejectedIcps.workspaceId, workspaceId));
}
