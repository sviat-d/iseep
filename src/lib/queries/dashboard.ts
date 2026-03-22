import { db } from "@/db";
import { icps, segments, deals, scoredUploads, scoredLeads } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const MIN_DEALS_FOR_CONFIDENCE = 5;
export const STRONG_CONFIDENCE_THRESHOLD = 20;

export async function getDashboardStats(workspaceId: string) {
  const [icpCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(icps)
    .where(and(eq(icps.workspaceId, workspaceId), eq(icps.status, "active")));

  const [segmentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(segments)
    .where(and(eq(segments.workspaceId, workspaceId), eq(segments.status, "active")));

  const [dealCounts] = await db
    .select({
      open: sql<number>`count(*) filter (where outcome = 'open')::int`,
      won: sql<number>`count(*) filter (where outcome = 'won')::int`,
      total: sql<number>`count(*) filter (where outcome in ('won', 'lost'))::int`,
    })
    .from(deals)
    .where(eq(deals.workspaceId, workspaceId));

  return {
    activeIcps: icpCount?.count ?? 0,
    activeSegments: segmentCount?.count ?? 0,
    openDeals: dealCounts?.open ?? 0,
    wonDeals: dealCounts?.won ?? 0,
    closedDeals: dealCounts?.total ?? 0,
  };
}

export async function getIcpHealth(workspaceId: string) {
  const result = await db
    .select({
      id: icps.id,
      name: icps.name,
      status: icps.status,
      version: icps.version,
      updatedAt: icps.updatedAt,
      qualifyCount: sql<number>`(select count(*) from criteria where criteria.icp_id = ${icps.id} and criteria.intent = 'qualify')::int`,
      excludeCount: sql<number>`(select count(*) from criteria where criteria.icp_id = ${icps.id} and criteria.intent = 'exclude')::int`,
      personaCount: sql<number>`(select count(*) from personas where personas.icp_id = ${icps.id})::int`,
      dealTotal: sql<number>`(select count(*) from deals where deals.icp_id = ${icps.id})::int`,
      dealWon: sql<number>`(select count(*) from deals where deals.icp_id = ${icps.id} and deals.outcome = 'won')::int`,
      dealLost: sql<number>`(select count(*) from deals where deals.icp_id = ${icps.id} and deals.outcome = 'lost')::int`,
      dealOpen: sql<number>`(select count(*) from deals where deals.icp_id = ${icps.id} and deals.outcome = 'open')::int`,
    })
    .from(icps)
    .where(and(eq(icps.workspaceId, workspaceId), eq(icps.status, "active")))
    .orderBy(icps.name);

  return result;
}

export async function getRecentActivity(workspaceId: string, limit = 5) {
  return db
    .select({
      id: icps.id,
      name: icps.name,
      status: icps.status,
      updatedAt: icps.updatedAt,
    })
    .from(icps)
    .where(eq(icps.workspaceId, workspaceId))
    .orderBy(sql`${icps.updatedAt} desc`)
    .limit(limit);
}

export async function getDashboardState(workspaceId: string) {
  const [icpCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(icps)
    .where(eq(icps.workspaceId, workspaceId));

  const [scoringCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scoredUploads)
    .where(eq(scoredUploads.workspaceId, workspaceId));

  const [dealCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(deals)
    .where(eq(deals.workspaceId, workspaceId));

  return {
    hasIcps: (icpCount?.count ?? 0) > 0,
    hasScoringRuns: (scoringCount?.count ?? 0) > 0,
    hasDeals: (dealCount?.count ?? 0) > 0,
    icpCount: icpCount?.count ?? 0,
    scoringRunCount: scoringCount?.count ?? 0,
    dealCount: dealCount?.count ?? 0,
  };
}

export async function getLatestScoringRun(workspaceId: string) {
  const [upload] = await db
    .select()
    .from(scoredUploads)
    .where(eq(scoredUploads.workspaceId, workspaceId))
    .orderBy(sql`${scoredUploads.createdAt} desc`)
    .limit(1);

  if (!upload) return null;

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
    .where(eq(scoredLeads.uploadId, upload.id));

  return { upload, stats: stats ?? { total: 0, high: 0, medium: 0, low: 0, risk: 0, blocked: 0, none: 0 } };
}
