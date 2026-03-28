"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { icpEvidence } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ActionResult } from "@/lib/types";

const VALID_OUTCOMES = ["won", "lost", "in_progress"] as const;
const VALID_CHANNELS = ["linkedin", "email", "conference", "referral", "inbound", "other"] as const;

export async function addCase(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const icpId = formData.get("icpId") as string;
  const companyName = (formData.get("companyName") as string)?.trim();
  const outcome = formData.get("outcome") as string;

  if (!icpId || !companyName || !outcome) {
    return { error: "Company name and outcome are required" };
  }

  if (!VALID_OUTCOMES.includes(outcome as typeof VALID_OUTCOMES[number])) {
    return { error: "Invalid outcome" };
  }

  const productId = (formData.get("productId") as string) || null;
  const useCaseIdsRaw = (formData.get("useCaseIds") as string) || "";
  const useCaseIds = useCaseIdsRaw ? useCaseIdsRaw.split(",").filter(Boolean) : [];
  const channel = (formData.get("channel") as string) || null;
  const channelDetail = (formData.get("channelDetail") as string)?.trim() || null;
  const segmentId = (formData.get("segmentId") as string) || null;
  const hypothesis = (formData.get("hypothesis") as string)?.trim() || null;
  const hypothesisId = (formData.get("hypothesisId") as string) || null;
  const dealValueRaw = (formData.get("dealValue") as string)?.trim() || null;
  const dealType = (formData.get("dealType") as string) || null;
  const whyWon = (formData.get("whyWon") as string)?.trim() || null;
  const whyLost = (formData.get("whyLost") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;
  const tagsRaw = formData.get("reasonTags") as string;

  const reasonTags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Extract domain from company name if it looks like a URL
  let companyDomain: string | null = null;
  if (companyName.includes(".")) {
    companyDomain = companyName.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  }

  await db.insert(icpEvidence).values({
    workspaceId: ctx.workspaceId,
    icpId,
    productId,
    useCaseIds,
    companyName,
    companyDomain,
    outcome: outcome as "won" | "lost" | "in_progress",
    segmentId: segmentId || null,
    channel: channel && VALID_CHANNELS.includes(channel as typeof VALID_CHANNELS[number])
      ? (channel as "linkedin" | "email" | "conference" | "referral" | "inbound" | "other")
      : null,
    channelDetail,
    reasonTags,
    hypothesis,
    hypothesisId: hypothesisId || null,
    dealValue: dealValueRaw,
    dealType: dealType as "mrr" | "one_time" | "all_time" | "ltv_estimated" | null,
    whyWon,
    whyLost,
    note,
  });

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function updateCase(caseId: string, icpId: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const companyName = (formData.get("companyName") as string)?.trim();
  const outcome = formData.get("outcome") as string;
  if (!companyName || !outcome) return { error: "Company and outcome are required" };

  const useCaseIdsRaw = (formData.get("useCaseIds") as string) || "";
  const useCaseIds = useCaseIdsRaw ? useCaseIdsRaw.split(",").filter(Boolean) : [];
  const channel = (formData.get("channel") as string) || null;
  const channelDetail = (formData.get("channelDetail") as string)?.trim() || null;
  const segmentId = (formData.get("segmentId") as string) || null;
  const hypothesis = (formData.get("hypothesis") as string)?.trim() || null;
  const hypothesisId = (formData.get("hypothesisId") as string) || null;
  const dealValueRaw = (formData.get("dealValue") as string)?.trim() || null;
  const dealType = (formData.get("dealType") as string) || null;
  const whyWon = (formData.get("whyWon") as string)?.trim() || null;
  const whyLost = (formData.get("whyLost") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;
  const tagsRaw = formData.get("reasonTags") as string;
  const reasonTags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  await db
    .update(icpEvidence)
    .set({
      companyName,
      outcome: outcome as "won" | "lost" | "in_progress",
      useCaseIds,
      channel: channel && VALID_CHANNELS.includes(channel as typeof VALID_CHANNELS[number])
        ? (channel as "linkedin" | "email" | "conference" | "referral" | "inbound" | "other")
        : null,
      channelDetail,
      segmentId: segmentId || null,
      reasonTags,
      hypothesis,
      hypothesisId: hypothesisId || null,
      dealValue: dealValueRaw,
      dealType: dealType as "mrr" | "one_time" | "all_time" | "ltv_estimated" | null,
      whyWon,
      whyLost,
      note,
      updatedAt: new Date(),
    })
    .where(and(eq(icpEvidence.id, caseId), eq(icpEvidence.workspaceId, ctx.workspaceId)));

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function deleteCase(caseId: string, icpId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .delete(icpEvidence)
    .where(
      and(eq(icpEvidence.id, caseId), eq(icpEvidence.workspaceId, ctx.workspaceId))
    );

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function getCasesForIcp(icpId: string, workspaceId: string, productId?: string) {
  const conditions = [eq(icpEvidence.icpId, icpId), eq(icpEvidence.workspaceId, workspaceId)];
  if (productId) conditions.push(eq(icpEvidence.productId, productId));

  return db
    .select()
    .from(icpEvidence)
    .where(and(...conditions))
    .orderBy(icpEvidence.createdAt);
}

/** Find related cases for a company across other products */
export async function findRelatedCases(
  companyName: string,
  workspaceId: string,
  excludeProductId?: string,
) {
  const normalized = companyName.trim().toLowerCase();
  if (!normalized) return [];

  const conditions = [
    eq(icpEvidence.workspaceId, workspaceId),
    sql`lower(trim(${icpEvidence.companyName})) = ${normalized}`,
  ];
  if (excludeProductId) {
    conditions.push(sql`(${icpEvidence.productId} IS NULL OR ${icpEvidence.productId} != ${excludeProductId})`);
  }

  return db
    .select()
    .from(icpEvidence)
    .where(and(...conditions))
    .orderBy(icpEvidence.createdAt)
    .limit(5);
}

// Keep old names as aliases for backward compatibility
export const addEvidence = addCase;
export const deleteEvidence = deleteCase;
export const getEvidenceForIcp = getCasesForIcp;
