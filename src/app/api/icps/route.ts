import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { icps, criteria, personas } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;

  const icpList = await db
    .select()
    .from(icps)
    .where(
      and(
        eq(icps.workspaceId, auth.workspaceId),
        sql`${icps.status} IN ('active', 'draft')`,
      ),
    );

  if (icpList.length === 0) {
    return Response.json({ icps: [] });
  }

  const icpIds = icpList.map(i => i.id);

  const allCriteria = await db
    .select()
    .from(criteria)
    .where(inArray(criteria.icpId, icpIds));

  const allPersonas = await db
    .select()
    .from(personas)
    .where(inArray(personas.icpId, icpIds));

  const result = icpList.map(icp => ({
    id: icp.id,
    name: icp.name,
    status: icp.status,
    description: icp.description,
    version: icp.version,
    criteria: allCriteria
      .filter(c => c.icpId === icp.id)
      .map(c => ({
        group: c.group,
        category: c.category,
        value: c.value,
        intent: c.intent,
        weight: c.weight,
        operator: c.operator,
        note: c.note,
      })),
    personas: allPersonas
      .filter(p => p.icpId === icp.id)
      .map(p => ({
        name: p.name,
        description: p.description,
      })),
  }));

  return Response.json({ icps: result });
}
