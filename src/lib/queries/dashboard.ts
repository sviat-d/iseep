import { db } from "@/db";
import { icps } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function getIcpOverview(workspaceId: string) {
  return db
    .select({
      id: icps.id,
      name: icps.name,
      status: icps.status,
      version: icps.version,
      productId: icps.productId,
      productName: sql<string | null>`(select p.name from products p where p.id = ${icps.productId})`,
      updatedAt: icps.updatedAt,
      qualifyCount: sql<number>`(select count(*) from criteria where criteria.icp_id = ${icps.id} and criteria.intent = 'qualify')::int`,
      excludeCount: sql<number>`(select count(*) from criteria where criteria.icp_id = ${icps.id} and criteria.intent = 'exclude')::int`,
      personaCount: sql<number>`(select count(*) from personas where personas.icp_id = ${icps.id})::int`,
      evidenceCount: sql<number>`(select count(*) from icp_evidence where icp_evidence.icp_id = ${icps.id})::int`,
      productCount: sql<number>`(select count(*) from product_icps where product_icps.icp_id = ${icps.id})::int`,
    })
    .from(icps)
    .where(eq(icps.workspaceId, workspaceId))
    .orderBy(sql`${icps.updatedAt} desc`);
}
