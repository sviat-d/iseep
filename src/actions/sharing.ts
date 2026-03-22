"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { icps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { randomBytes } from "crypto";

export async function enableSharing(
  icpId: string,
  mode: "without_stats" | "with_stats"
): Promise<ActionResult & { shareToken?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ctx.workspaceId)));
  if (!icp) return { error: "Not found" };

  const token = icp.shareToken ?? randomBytes(16).toString("hex");

  await db
    .update(icps)
    .set({
      shareToken: token,
      shareMode: mode,
      updatedAt: new Date(),
    })
    .where(eq(icps.id, icpId));

  revalidatePath(`/icps/${icpId}`);
  return { success: true, shareToken: token };
}

export async function disableSharing(icpId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ctx.workspaceId)));
  if (!icp) return { error: "Not found" };

  await db
    .update(icps)
    .set({
      shareToken: null,
      shareMode: null,
      updatedAt: new Date(),
    })
    .where(eq(icps.id, icpId));

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function updateShareMode(
  icpId: string,
  mode: "without_stats" | "with_stats"
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .update(icps)
    .set({
      shareMode: mode,
      updatedAt: new Date(),
    })
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ctx.workspaceId)));

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}
