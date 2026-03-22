import { db } from "@/db";
import { segments, icps } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getSegments(workspaceId: string) {
  const result = await db
    .select({
      id: segments.id,
      name: segments.name,
      description: segments.description,
      status: segments.status,
      priorityScore: segments.priorityScore,
      logicJson: segments.logicJson,
      icpId: segments.icpId,
      icpName: icps.name,
      createdAt: segments.createdAt,
      updatedAt: segments.updatedAt,
    })
    .from(segments)
    .innerJoin(icps, eq(segments.icpId, icps.id))
    .where(eq(segments.workspaceId, workspaceId))
    .orderBy(icps.name, segments.name);

  return result;
}

export async function getSegment(id: string, workspaceId: string) {
  const [segment] = await db
    .select({
      id: segments.id,
      name: segments.name,
      description: segments.description,
      status: segments.status,
      priorityScore: segments.priorityScore,
      logicJson: segments.logicJson,
      icpId: segments.icpId,
      icpName: icps.name,
      personaId: segments.personaId,
      createdAt: segments.createdAt,
      updatedAt: segments.updatedAt,
    })
    .from(segments)
    .innerJoin(icps, eq(segments.icpId, icps.id))
    .where(and(eq(segments.id, id), eq(segments.workspaceId, workspaceId)));

  return segment ?? null;
}

export async function getSegmentsForIcp(icpId: string, workspaceId: string) {
  return db
    .select()
    .from(segments)
    .where(and(eq(segments.icpId, icpId), eq(segments.workspaceId, workspaceId)))
    .orderBy(segments.name);
}
