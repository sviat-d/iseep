"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { drafts, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { parseDraftsInput } from "@/lib/drafts/parse";
import {
  applyCreateIcp,
  applyUpdateProduct,
  applyUpdateIcp,
  applyCreateSegment,
} from "@/lib/drafts/apply";
import type {
  CreateIcpPayload,
  UpdateProductPayload,
  UpdateIcpPayload,
  CreateSegmentPayload,
} from "@/lib/drafts/types";
import { randomBytes } from "crypto";

export async function createDrafts(
  jsonString: string,
  source: string = "claude",
): Promise<ActionResult & { ids?: string[] }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const result = parseDraftsInput(jsonString);
  if (!result.success) {
    return { error: result.error };
  }

  const ids: string[] = [];
  for (const d of result.drafts) {
    const [row] = await db
      .insert(drafts)
      .values({
        workspaceId: ctx.workspaceId,
        source,
        targetType: d.targetType,
        targetId: d.targetId,
        payload: d.payload,
        summary: d.summary,
        reasoning: d.reasoning,
        createdBy: ctx.userId,
      })
      .returning({ id: drafts.id });
    ids.push(row.id);
  }

  const { logActivity } = await import("@/lib/activity");
  await logActivity(ctx.workspaceId, ctx.userId, {
    eventType: "draft_submitted",
    entityType: "draft",
    summary: `Submitted ${ids.length} suggestion(s)`,
  });

  revalidatePath("/drafts");
  return { success: true, ids };
}

export async function approveDraft(
  draftId: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [draft] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.workspaceId, ctx.workspaceId)));

  if (!draft) return { error: "Draft not found" };
  if (draft.status !== "pending") return { error: `Draft is already ${draft.status}` };

  try {
    switch (draft.targetType) {
      case "create_icp":
        await applyCreateIcp(ctx.workspaceId, ctx.userId, draft.payload as CreateIcpPayload);
        revalidatePath("/icps");
        break;
      case "update_product":
        await applyUpdateProduct(ctx.workspaceId, draft.payload as UpdateProductPayload);
        revalidatePath("/settings/product");
        revalidatePath("/dashboard");
        break;
      case "update_icp":
        if (!draft.targetId) return { error: "Missing target ICP ID" };
        await applyUpdateIcp(ctx.workspaceId, draft.targetId, draft.payload as UpdateIcpPayload);
        revalidatePath("/icps");
        revalidatePath(`/icps/${draft.targetId}`);
        break;
      case "create_segment":
        await applyCreateSegment(ctx.workspaceId, draft.payload as CreateSegmentPayload);
        revalidatePath("/segments");
        break;
      default:
        return { error: `Unknown target type: ${draft.targetType}` };
    }

    await db
      .update(drafts)
      .set({
        status: "applied",
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        appliedAt: new Date(),
      })
      .where(eq(drafts.id, draftId));

    const { logActivity } = await import("@/lib/activity");
    await logActivity(ctx.workspaceId, ctx.userId, {
      eventType: "draft_approved",
      entityType: "draft",
      entityId: draftId,
      summary: `Approved suggestion: ${draft.summary}`,
    });

    revalidatePath("/drafts");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to apply: ${msg}` };
  }
}

export async function rejectDraft(
  draftId: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [draft] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.workspaceId, ctx.workspaceId)));

  if (!draft) return { error: "Draft not found" };
  if (draft.status !== "pending") return { error: `Draft is already ${draft.status}` };

  await db
    .update(drafts)
    .set({
      status: "rejected",
      reviewedBy: ctx.userId,
      reviewedAt: new Date(),
    })
    .where(eq(drafts.id, draftId));

  const { logActivity } = await import("@/lib/activity");
  await logActivity(ctx.workspaceId, ctx.userId, {
    eventType: "draft_rejected",
    entityType: "draft",
    entityId: draftId,
    summary: `Rejected suggestion: ${draft.summary}`,
  });

  revalidatePath("/drafts");
  return { success: true };
}

export async function generateApiToken(): Promise<ActionResult & { token?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const token = randomBytes(32).toString("hex");

  await db
    .update(workspaces)
    .set({ apiToken: token, updatedAt: new Date() })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/settings/ai");
  return { success: true, token };
}
