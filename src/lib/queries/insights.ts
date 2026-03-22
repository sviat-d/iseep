import { db } from "@/db";
import { deals, icps, segments, dealReasons, productRequests } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getWinLossByIcp(workspaceId: string) {
  return db
    .select({
      icpId: icps.id,
      icpName: icps.name,
      won: sql<number>`count(*) filter (where ${deals.outcome} = 'won')::int`,
      lost: sql<number>`count(*) filter (where ${deals.outcome} = 'lost')::int`,
      open: sql<number>`count(*) filter (where ${deals.outcome} = 'open')::int`,
      totalValue: sql<number>`coalesce(sum(${deals.dealValue}::numeric) filter (where ${deals.outcome} = 'won'), 0)::int`,
    })
    .from(deals)
    .innerJoin(icps, eq(deals.icpId, icps.id))
    .where(eq(deals.workspaceId, workspaceId))
    .groupBy(icps.id, icps.name)
    .orderBy(icps.name);
}

export async function getWinLossBySegment(workspaceId: string) {
  return db
    .select({
      segmentId: segments.id,
      segmentName: segments.name,
      icpName: icps.name,
      won: sql<number>`count(*) filter (where ${deals.outcome} = 'won')::int`,
      lost: sql<number>`count(*) filter (where ${deals.outcome} = 'lost')::int`,
      open: sql<number>`count(*) filter (where ${deals.outcome} = 'open')::int`,
    })
    .from(deals)
    .innerJoin(segments, eq(deals.segmentId, segments.id))
    .innerJoin(icps, eq(segments.icpId, icps.id))
    .where(eq(deals.workspaceId, workspaceId))
    .groupBy(segments.id, segments.name, icps.name)
    .orderBy(icps.name, segments.name);
}

export async function getTopLossReasons(workspaceId: string, limit = 10) {
  return db
    .select({
      category: dealReasons.category,
      tag: dealReasons.tag,
      count: sql<number>`count(*)::int`,
      avgSeverity: sql<number>`round(avg(${dealReasons.severity}), 1)::float`,
    })
    .from(dealReasons)
    .where(and(eq(dealReasons.workspaceId, workspaceId), eq(dealReasons.reasonType, "loss")))
    .groupBy(dealReasons.category, dealReasons.tag)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export async function getTopRequestsByIcp(workspaceId: string) {
  return db
    .select({
      icpName: icps.name,
      requestCount: sql<number>`count(*)::int`,
      topType: sql<string>`mode() within group (order by ${productRequests.type})`,
    })
    .from(productRequests)
    .innerJoin(icps, eq(productRequests.icpId, icps.id))
    .where(eq(productRequests.workspaceId, workspaceId))
    .groupBy(icps.name)
    .orderBy(sql`count(*) desc`);
}
