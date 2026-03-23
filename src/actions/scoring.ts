"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scoredUploads, scoredLeads, icps, criteria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { scoreLeadAgainstAllIcps } from "@/lib/scoring";
import {
  collectUniqueValues,
  collectIcpValues,
  mapValuesToIcp,
} from "@/lib/value-mapper";
import { checkAiLimit, trackAiUsage } from "@/lib/ai-usage";
import {
  getWorkspaceMappings,
  saveMappings,
} from "@/lib/scoring/mapping-memory";
import { SAMPLE_LEADS, SAMPLE_COLUMN_MAPPING } from "@/lib/sample-data";
import type { ActionResult } from "@/lib/types";

type ColumnMapping = Record<string, string>; // csvColumn -> mappedField

export async function processUpload(
  fileName: string,
  rows: Record<string, string>[],
  columnMapping: ColumnMapping,
  sourceName?: string,
): Promise<ActionResult & { uploadId?: string; aiMappingUsed?: boolean }> {
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
      }),
  );

  // Load workspace mapping memory
  const workspaceMemory = await getWorkspaceMappings(ctx.workspaceId);

  // Check AI limit for fuzzy matching
  let useAiMapping = false;
  try {
    const limit = await checkAiLimit(ctx.workspaceId);
    useAiMapping = limit.allowed;
  } catch {
    // If limit check fails, proceed without AI mapping
  }

  // Build value mappings using AI
  let aiMappings: Record<string, Record<string, string>> = {};
  let aiMappingUsed = false;

  if (useAiMapping) {
    try {
      const csvUniqueValues = collectUniqueValues(rows, columnMapping);
      const allCriteria = icpsWithCriteria.flatMap((ic) => ic.criteria);
      const icpUniqueValues = collectIcpValues(
        allCriteria.map((c) => ({ category: c.category, value: c.value })),
      );

      // Map each category that has values in both CSV and ICPs
      let aiCalled = false;
      for (const [category, csvVals] of Object.entries(csvUniqueValues)) {
        const icpVals = icpUniqueValues[category];
        if (icpVals && icpVals.length > 0) {
          try {
            const mapping = await mapValuesToIcp(csvVals, icpVals, category, ctx.workspaceId);
            if (Object.keys(mapping).length > 0) {
              aiMappings[category] = mapping;
              aiCalled = true;
            }
          } catch {
            // AI mapping failed for this category, continue with exact matching
          }
        }
      }

      if (aiCalled) {
        await trackAiUsage(ctx.workspaceId, ctx.userId, "csv_value_mapping");
        aiMappingUsed = true;

        // Save AI mappings to workspace memory for future use
        await saveMappings(ctx.workspaceId, aiMappings);
      }
    } catch {
      // AI mapping failed entirely, fall back to exact matching
      aiMappings = {};
    }
  }

  // Create upload record
  const [upload] = await db
    .insert(scoredUploads)
    .values({
      workspaceId: ctx.workspaceId,
      fileName,
      sourceName: sourceName || null,
      totalRows: rows.length,
      columnMapping,
      createdBy: ctx.userId,
    })
    .returning();

  // Score each row with workspace memory + AI mappings
  const leadInserts = rows.map((row) => {
    // Map CSV columns to standard fields
    const mapped: Record<string, string | undefined> = {};
    for (const [csvCol, field] of Object.entries(columnMapping)) {
      if (field && row[csvCol]) {
        mapped[field] = row[csvCol];
      }
    }

    const result = scoreLeadAgainstAllIcps(
      mapped,
      icpsWithCriteria,
      workspaceMemory,
      aiMappings,
    );

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
      confidence: result.confidence,
      matchReasons: result.matchReasons,
    };
  });

  // Insert in batches of 100
  for (let i = 0; i < leadInserts.length; i += 100) {
    const batch = leadInserts.slice(i, i + 100);
    await db.insert(scoredLeads).values(batch);
  }

  revalidatePath("/scoring");
  return { success: true, uploadId: upload.id, aiMappingUsed };
}

export async function processSampleData(): Promise<ActionResult & { uploadId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  return processUpload(
    "Sample leads (20 companies)",
    SAMPLE_LEADS,
    SAMPLE_COLUMN_MAPPING,
    "Sample dataset",
  );
}

export async function deleteUpload(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db.delete(scoredLeads).where(eq(scoredLeads.uploadId, id));
  await db.delete(scoredUploads).where(eq(scoredUploads.id, id));

  revalidatePath("/scoring");
  return { success: true };
}
