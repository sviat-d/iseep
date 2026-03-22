import { db } from "@/db";
import { productRequests, icps } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getRequests(workspaceId: string) {
  return db
    .select({
      id: productRequests.id,
      title: productRequests.title,
      description: productRequests.description,
      type: productRequests.type,
      status: productRequests.status,
      source: productRequests.source,
      frequencyScore: productRequests.frequencyScore,
      icpId: productRequests.icpId,
      icpName: icps.name,
      dealId: productRequests.dealId,
      createdAt: productRequests.createdAt,
    })
    .from(productRequests)
    .leftJoin(icps, eq(productRequests.icpId, icps.id))
    .where(eq(productRequests.workspaceId, workspaceId))
    .orderBy(sql`${productRequests.createdAt} desc`);
}

export async function getRequest(id: string, workspaceId: string) {
  const [request] = await db
    .select()
    .from(productRequests)
    .where(and(eq(productRequests.id, id), eq(productRequests.workspaceId, workspaceId)));
  return request ?? null;
}
