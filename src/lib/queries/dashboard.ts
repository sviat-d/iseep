import { db } from "@/db";
import { icps, segments, deals } from "@/db/schema";
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
