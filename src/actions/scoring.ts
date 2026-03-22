"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scoredUploads, scoredLeads, icps, criteria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { scoreLeadAgainstAllIcps } from "@/lib/scoring";
import type { ActionResult } from "@/lib/types";

type ColumnMapping = Record<string, string>; // csvColumn -> mappedField

export async function processUpload(
  fileName: string,
  rows: Record<string, string>[],
  columnMapping: ColumnMapping
): Promise<ActionResult & { uploadId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (rows.length === 0) return { error: "No data rows found" };

  // Load all active ICPs with their criteria
  const allIcps = await db
    .select()
    .from(icps)
    .where(eq(icps.workspaceId, ctx.workspaceId));

  const icpsWithCriteria = await Promise.all(
    allIcps
      .filter((icp) => icp.status === "active")
      .map(async (icp) => {
        const icpCriteria = await db
          .select()
          .from(criteria)
          .where(eq(criteria.icpId, icp.id));
        return { icp, criteria: icpCriteria };
      })
  );

  // Create upload record
  const [upload] = await db
    .insert(scoredUploads)
    .values({
      workspaceId: ctx.workspaceId,
      fileName,
      totalRows: rows.length,
      columnMapping,
      createdBy: ctx.userId,
    })
    .returning();

  // Score each row
  const leadInserts = rows.map((row) => {
    // Map CSV columns to standard fields
    const mapped: Record<string, string | undefined> = {};
    for (const [csvCol, field] of Object.entries(columnMapping)) {
      if (field && row[csvCol]) {
        mapped[field] = row[csvCol];
      }
    }

    const result = scoreLeadAgainstAllIcps(mapped, icpsWithCriteria);

    return {
      uploadId: upload.id,
      workspaceId: ctx.workspaceId,
      rawData: row,
      companyName: mapped.company_name ?? null,
      industry: mapped.industry ?? null,
      country: mapped.country ?? null,
      website: mapped.website ?? null,
      contactName: mapped.contact_name ?? null,
      contactEmail: mapped.contact_email ?? null,
      bestIcpId: result.bestIcpId,
      bestIcpName: result.bestIcpName,
      fitScore: result.fitScore,
      fitLevel: result.fitLevel,
      matchReasons: result.matchReasons,
    };
  });

  // Insert in batches of 100
  for (let i = 0; i < leadInserts.length; i += 100) {
    const batch = leadInserts.slice(i, i + 100);
    await db.insert(scoredLeads).values(batch);
  }

  revalidatePath("/scoring");
  return { success: true, uploadId: upload.id };
}

export async function deleteUpload(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db.delete(scoredLeads).where(eq(scoredLeads.uploadId, id));
  await db.delete(scoredUploads).where(eq(scoredUploads.id, id));

  revalidatePath("/scoring");
  return { success: true };
}
