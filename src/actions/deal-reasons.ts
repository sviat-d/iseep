"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { dealReasons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { dealReasonSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function createDealReason(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    dealId: formData.get("dealId") as string,
    reasonType: formData.get("reasonType") as string,
    category: formData.get("category") as string,
    tag: formData.get("tag") as string,
    description: (formData.get("description") as string) || undefined,
    severity: formData.get("severity") ? Number(formData.get("severity")) : undefined,
  };

  const parsed = dealReasonSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(dealReasons).values({
    workspaceId: ctx.workspaceId,
    dealId: parsed.data.dealId,
    reasonType: parsed.data.reasonType,
    category: parsed.data.category,
    tag: parsed.data.tag,
    description: parsed.data.description ?? null,
    severity: parsed.data.severity ?? null,
  });

  revalidatePath(`/deals/${parsed.data.dealId}`);
  return { success: true };
}

export async function deleteDealReason(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db.select().from(dealReasons)
    .where(and(eq(dealReasons.id, id), eq(dealReasons.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  await db.delete(dealReasons).where(eq(dealReasons.id, id));
  revalidatePath(`/deals/${existing.dealId}`);
  return { success: true };
}
