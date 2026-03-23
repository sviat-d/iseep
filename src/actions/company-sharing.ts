"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { randomBytes } from "crypto";

export async function enableCompanySharing(
  mode: "without_stats" | "with_stats",
  icpIds: string[] | null,
): Promise<ActionResult & { shareToken?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));
  if (!ws) return { error: "Workspace not found" };

  const token = ws.profileShareToken ?? randomBytes(16).toString("hex");

  await db
    .update(workspaces)
    .set({
      profileShareToken: token,
      profileShareMode: mode,
      profileSharedIcpIds: icpIds,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/dashboard");
  return { success: true, shareToken: token };
}

export async function disableCompanySharing(): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .update(workspaces)
    .set({
      profileShareToken: null,
      profileShareMode: null,
      profileSharedIcpIds: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCompanyShareConfig(
  mode: "without_stats" | "with_stats",
  icpIds: string[] | null,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .update(workspaces)
    .set({
      profileShareMode: mode,
      profileSharedIcpIds: icpIds,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/dashboard");
  return { success: true };
}
