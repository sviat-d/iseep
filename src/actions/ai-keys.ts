"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { aiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { callAi } from "@/lib/ai-client";

export async function saveAiKey(
  provider: "anthropic" | "openai",
  apiKey: string,
  model?: string
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!apiKey.trim()) return { error: "API key is required" };

  // Upsert
  const [existing] = await db
    .select()
    .from(aiKeys)
    .where(eq(aiKeys.workspaceId, ctx.workspaceId));

  if (existing) {
    await db
      .update(aiKeys)
      .set({
        provider,
        apiKey: apiKey.trim(),
        model: model?.trim() || null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(aiKeys.id, existing.id));
  } else {
    await db.insert(aiKeys).values({
      workspaceId: ctx.workspaceId,
      provider,
      apiKey: apiKey.trim(),
      model: model?.trim() || null,
    });
  }

  revalidatePath("/settings/ai");
  return { success: true };
}

export async function removeAiKey(): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db.delete(aiKeys).where(eq(aiKeys.workspaceId, ctx.workspaceId));
  revalidatePath("/settings/ai");
  return { success: true };
}

export async function testAiKey(
  provider: "anthropic" | "openai",
  apiKey: string,
  model?: string
): Promise<ActionResult> {
  try {
    const config = {
      provider,
      apiKey,
      model:
        model ||
        (provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
      isUserKey: true,
    };

    await callAi(config, undefined, "Say OK in one word", 10);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (
      msg.includes("401") ||
      msg.includes("auth") ||
      msg.includes("invalid")
    ) {
      return { error: "Invalid API key. Please check and try again." };
    }
    if (msg.includes("credit") || msg.includes("billing")) {
      return {
        error: "Key works but has no credits. Please check your billing.",
      };
    }
    return { error: `Connection failed: ${msg.substring(0, 100)}` };
  }
}
