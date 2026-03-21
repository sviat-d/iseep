import { db } from "@/db";
import { personas, criteria, icps } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getPersonas(icpId: string, workspaceId: string) {
  return db
    .select()
    .from(personas)
    .where(and(eq(personas.icpId, icpId), eq(personas.workspaceId, workspaceId)))
    .orderBy(personas.name);
}

export async function getPersona(id: string, workspaceId: string) {
  const [persona] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.workspaceId, workspaceId)));

  if (!persona) return null;

  const [icp] = await db
    .select({ id: icps.id, name: icps.name })
    .from(icps)
    .where(eq(icps.id, persona.icpId));

  const personaCriteria = await db
    .select()
    .from(criteria)
    .where(and(eq(criteria.personaId, id), eq(criteria.workspaceId, workspaceId)))
    .orderBy(criteria.group, criteria.category);

  return { ...persona, icp, criteria: personaCriteria };
}
