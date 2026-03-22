import { db } from "@/db";
import { scoredUploads, scoredLeads } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function getScoredUploads(workspaceId: string) {
  return db
    .select()
    .from(scoredUploads)
    .where(eq(scoredUploads.workspaceId, workspaceId))
    .orderBy(sql`${scoredUploads.createdAt} desc`);
}

export async function getScoredUpload(id: string, workspaceId: string) {
  const [upload] = await db
    .select()
    .from(scoredUploads)
    .where(and(eq(scoredUploads.id, id), eq(scoredUploads.workspaceId, workspaceId)));
  return upload ?? null;
}

export async function getScoredLeads(uploadId: string, workspaceId: string) {
  return db
    .select()
    .from(scoredLeads)
    .where(and(eq(scoredLeads.uploadId, uploadId), eq(scoredLeads.workspaceId, workspaceId)))
    .orderBy(sql`${scoredLeads.fitScore} desc nulls last`);
}

export async function getScoredLeadStats(uploadId: string, workspaceId: string) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      high: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'high')::int`,
      medium: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'medium')::int`,
      low: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'low')::int`,
      risk: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'risk')::int`,
      blocked: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'blocked')::int`,
      none: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'none')::int`,
    })
    .from(scoredLeads)
    .where(and(eq(scoredLeads.uploadId, uploadId), eq(scoredLeads.workspaceId, workspaceId)));

  return stats ?? { total: 0, high: 0, medium: 0, low: 0, risk: 0, blocked: 0, none: 0 };
}

export async function getBulkUploadStats(uploadIds: string[], workspaceId: string) {
  if (uploadIds.length === 0) return {};

  const rows = await db
    .select({
      uploadId: scoredLeads.uploadId,
      total: sql<number>`count(*)::int`,
      high: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'high')::int`,
      medium: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'medium')::int`,
      low: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'low')::int`,
      risk: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'risk')::int`,
      blocked: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'blocked')::int`,
      none: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'none')::int`,
    })
    .from(scoredLeads)
    .where(
      and(
        inArray(scoredLeads.uploadId, uploadIds),
        eq(scoredLeads.workspaceId, workspaceId),
      ),
    )
    .groupBy(scoredLeads.uploadId);

  const result: Record<string, { high: number; medium: number; low: number; risk: number; blocked: number; none: number; total: number }> = {};
  for (const row of rows) {
    result[row.uploadId] = {
      total: row.total,
      high: row.high,
      medium: row.medium,
      low: row.low,
      risk: row.risk,
      blocked: row.blocked,
      none: row.none,
    };
  }
  return result;
}
