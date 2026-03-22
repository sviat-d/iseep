"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies, criteria } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function mergeIndustryValue(
  oldValue: string,
  newValue: string
): Promise<ActionResult & { replacedCount?: number }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!oldValue || !newValue) return { error: "Both values are required" };
  if (oldValue === newValue) return { error: "Values must be different" };

  let replacedCount = 0;

  // Replace in companies.industry
  const companyResult = await db
    .update(companies)
    .set({ industry: newValue, updatedAt: new Date() })
    .where(
      and(
        eq(companies.workspaceId, ctx.workspaceId),
        eq(companies.industry, oldValue)
      )
    )
    .returning();
  replacedCount += companyResult.length;

  // Replace in criteria where category = 'industry'
  // Criteria values can be comma-separated, so we need to handle that
  const industryCriteria = await db
    .select()
    .from(criteria)
    .where(
      and(
        eq(criteria.workspaceId, ctx.workspaceId),
        eq(criteria.category, "industry")
      )
    );

  for (const criterion of industryCriteria) {
    const values = criterion.value.split(",").map((v) => v.trim());
    const hasOld = values.includes(oldValue);
    if (hasOld) {
      const newValues = values.map((v) => (v === oldValue ? newValue : v));
      // Deduplicate in case newValue was already in the list
      const unique = [...new Set(newValues)];
      await db
        .update(criteria)
        .set({ value: unique.join(", "), updatedAt: new Date() })
        .where(eq(criteria.id, criterion.id));
      replacedCount++;
    }
  }

  revalidatePath("/deals");
  revalidatePath("/companies");
  revalidatePath("/icps");
  return { success: true, replacedCount };
}
