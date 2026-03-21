import { db } from "@/db";
import { icps, criteria, personas, signals, segments, icpSnapshots, deals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getIcps(workspaceId: string) {
  const result = await db
    .select({
      id: icps.id,
      name: icps.name,
      description: icps.description,
      status: icps.status,
      version: icps.version,
      createdAt: icps.createdAt,
      updatedAt: icps.updatedAt,
      qualifyCount: sql<number>`(select count(*) from criteria where criteria.icp_id = ${icps.id} and criteria.intent = 'qualify')::int`,
      excludeCount: sql<number>`(select count(*) from criteria where criteria.icp_id = ${icps.id} and criteria.intent = 'exclude')::int`,
      personaCount: sql<number>`(select count(*) from personas where personas.icp_id = ${icps.id})::int`,
    })
    .from(icps)
    .where(eq(icps.workspaceId, workspaceId))
    .orderBy(sql`${icps.updatedAt} desc`);

  return result;
}

export async function getIcp(id: string, workspaceId: string) {
  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, id), eq(icps.workspaceId, workspaceId)));

  if (!icp) return null;

  const icpCriteria = await db
    .select()
    .from(criteria)
    .where(and(eq(criteria.icpId, id), eq(criteria.workspaceId, workspaceId)))
    .orderBy(criteria.group, criteria.category);

  const icpPersonas = await db
    .select()
    .from(personas)
    .where(and(eq(personas.icpId, id), eq(personas.workspaceId, workspaceId)))
    .orderBy(personas.name);

  const icpSignals = await db
    .select()
    .from(signals)
    .where(and(eq(signals.icpId, id), eq(signals.workspaceId, workspaceId)))
    .orderBy(signals.type, signals.label);

  const icpSegments = await db
    .select({
      id: segments.id,
      name: segments.name,
      status: segments.status,
      priorityScore: segments.priorityScore,
    })
    .from(segments)
    .where(and(eq(segments.icpId, id), eq(segments.workspaceId, workspaceId)))
    .orderBy(segments.priorityScore);

  const dealStats = await db
    .select({
      total: sql<number>`count(*)::int`,
      won: sql<number>`count(*) filter (where outcome = 'won')::int`,
      lost: sql<number>`count(*) filter (where outcome = 'lost')::int`,
      open: sql<number>`count(*) filter (where outcome = 'open')::int`,
    })
    .from(deals)
    .where(and(eq(deals.icpId, id), eq(deals.workspaceId, workspaceId)));

  return {
    ...icp,
    criteria: icpCriteria,
    personas: icpPersonas,
    signals: icpSignals,
    segments: icpSegments,
    dealStats: dealStats[0] ?? { total: 0, won: 0, lost: 0, open: 0 },
  };
}

export async function getIcpSnapshots(icpId: string, workspaceId: string) {
  return db
    .select()
    .from(icpSnapshots)
    .where(and(eq(icpSnapshots.icpId, icpId), eq(icpSnapshots.workspaceId, workspaceId)))
    .orderBy(sql`${icpSnapshots.version} desc`);
}

export async function getIcpsForSelect(workspaceId: string) {
  return db
    .select({ id: icps.id, name: icps.name })
    .from(icps)
    .where(eq(icps.workspaceId, workspaceId))
    .orderBy(icps.name);
}
