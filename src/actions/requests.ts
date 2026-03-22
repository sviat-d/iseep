"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { productRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

type RequestType = "feature_request" | "adjacent_product" | "use_case" | "integration_request";
type RequestSource = "deal" | "meeting_note" | "manual";
type RequestStatus = "open" | "validated" | "planned" | "rejected";

const VALID_TYPES: RequestType[] = ["feature_request", "adjacent_product", "use_case", "integration_request"];
const VALID_SOURCES: RequestSource[] = ["deal", "meeting_note", "manual"];
const VALID_STATUSES: RequestStatus[] = ["open", "validated", "planned", "rejected"];

export async function createRequest(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const title = formData.get("title") as string;
  if (!title) return { error: "Title is required" };

  const rawType = (formData.get("type") as string) || "feature_request";
  const type: RequestType = VALID_TYPES.includes(rawType as RequestType)
    ? (rawType as RequestType)
    : "feature_request";

  const rawSource = (formData.get("source") as string) || "manual";
  const source: RequestSource = VALID_SOURCES.includes(rawSource as RequestSource)
    ? (rawSource as RequestSource)
    : "manual";

  await db.insert(productRequests).values({
    workspaceId: ctx.workspaceId,
    title,
    description: (formData.get("description") as string) || null,
    type,
    status: "open",
    source,
    frequencyScore: formData.get("frequencyScore") ? Number(formData.get("frequencyScore")) : null,
    icpId: (formData.get("icpId") as string) || null,
    dealId: (formData.get("dealId") as string) || null,
    personaId: (formData.get("personaId") as string) || null,
    segmentId: (formData.get("segmentId") as string) || null,
  }).returning();

  revalidatePath("/requests");
  return { success: true };
}

export async function updateRequestStatus(id: string, status: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!VALID_STATUSES.includes(status as RequestStatus)) {
    return { error: "Invalid status" };
  }

  const [existing] = await db.select().from(productRequests)
    .where(and(eq(productRequests.id, id), eq(productRequests.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.update(productRequests)
    .set({ status: status as RequestStatus, updatedAt: new Date() })
    .where(eq(productRequests.id, id));

  revalidatePath("/requests");
  return { success: true };
}

export async function deleteRequest(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(productRequests)
    .where(and(eq(productRequests.id, id), eq(productRequests.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(productRequests).where(eq(productRequests.id, id));
  revalidatePath("/requests");
  return { success: true };
}
