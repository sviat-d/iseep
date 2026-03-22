import { db } from "@/db";
import { scoredUploads, scoredLeads } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

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
      none: sql<number>`count(*) filter (where ${scoredLeads.fitLevel} = 'none')::int`,
    })
    .from(scoredLeads)
    .where(and(eq(scoredLeads.uploadId, uploadId), eq(scoredLeads.workspaceId, workspaceId)));

  return stats ?? { total: 0, high: 0, medium: 0, low: 0, none: 0 };
}
