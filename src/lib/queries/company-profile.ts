import { db } from "@/db";
import {
  workspaces,
  products,
  productContext,
  icps,
  criteria,
  personas,
  segments,
  deals,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export async function getSharedCompanyProfile(shareToken: string) {
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.profileShareToken, shareToken));

  if (!ws || !ws.profileShareToken) return null;

  // Load products for this workspace
  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.workspaceId, ws.id))
    .orderBy(products.createdAt);

  // Determine which ICPs to show
  const selectedIds = ws.profileSharedIcpIds as string[] | null;

  const allIcps = selectedIds
    ? await db
        .select()
        .from(icps)
        .where(and(eq(icps.workspaceId, ws.id), inArray(icps.id, selectedIds)))
        .orderBy(icps.name)
    : await db
        .select()
        .from(icps)
        .where(and(eq(icps.workspaceId, ws.id), eq(icps.status, "active")))
        .orderBy(icps.name);

  // Load criteria and personas counts per ICP
  const icpCards = await Promise.all(
    allIcps.map(async (icp) => {
      const [criteriaCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(criteria)
        .where(eq(criteria.icpId, icp.id));

      const [personaCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(personas)
        .where(eq(personas.icpId, icp.id));

      let dealStats = { total: 0, won: 0, lost: 0, open: 0 };
      if (ws.profileShareMode === "with_stats") {
        const [stats] = await db
          .select({
            total: sql<number>`count(*)::int`,
            won: sql<number>`count(*) filter (where outcome = 'won')::int`,
            lost: sql<number>`count(*) filter (where outcome = 'lost')::int`,
            open: sql<number>`count(*) filter (where outcome = 'open')::int`,
          })
          .from(deals)
          .where(eq(deals.icpId, icp.id));
        if (stats) dealStats = stats;
      }

      return {
        id: icp.id,
        name: icp.name,
        description: icp.description,
        status: icp.status,
        version: icp.version,
        productId: icp.productId,
        criteriaCount: criteriaCount?.count ?? 0,
        personaCount: personaCount?.count ?? 0,
        dealStats,
      };
    }),
  );

  // Build products with their ICPs
  const productsWithIcps = allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    coreUseCases: (p.coreUseCases as string[]) ?? [],
    keyValueProps: (p.keyValueProps as string[]) ?? [],
    icps: icpCards.filter((icp) => icp.productId === p.id),
  }));

  // ICPs without product (legacy)
  const unlinkedIcps = icpCards.filter((icp) => !icp.productId);

  return {
    workspace: {
      name: ws.name,
      website: ws.website,
      companyDescription: ws.companyDescription,
      targetCustomers: ws.targetCustomers,
      industriesFocus: (ws.industriesFocus as string[]) ?? [],
      geoFocus: (ws.geoFocus as string[]) ?? [],
      shareMode: ws.profileShareMode,
    },
    products: productsWithIcps,
    unlinkedIcps,
    showStats: ws.profileShareMode === "with_stats",
  };
}

export async function getSharedCompanyIcp(
  shareToken: string,
  icpId: string,
) {
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.profileShareToken, shareToken));

  if (!ws || !ws.profileShareToken) return null;

  const selectedIds = ws.profileSharedIcpIds as string[] | null;
  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ws.id)));

  if (!icp) return null;
  if (selectedIds && !selectedIds.includes(icp.id)) return null;
  if (!selectedIds && icp.status !== "active") return null;

  const icpCriteria = await db.select().from(criteria).where(eq(criteria.icpId, icp.id)).orderBy(criteria.group, criteria.category);
  const icpPersonas = await db.select().from(personas).where(eq(personas.icpId, icp.id)).orderBy(personas.name);
  const icpSegments = await db.select({ id: segments.id, name: segments.name, status: segments.status, priorityScore: segments.priorityScore }).from(segments).where(eq(segments.icpId, icp.id)).orderBy(segments.name);

  let dealStats = { total: 0, won: 0, lost: 0, open: 0 };
  if (ws.profileShareMode === "with_stats") {
    const [stats] = await db.select({
      total: sql<number>`count(*)::int`,
      won: sql<number>`count(*) filter (where outcome = 'won')::int`,
      lost: sql<number>`count(*) filter (where outcome = 'lost')::int`,
      open: sql<number>`count(*) filter (where outcome = 'open')::int`,
    }).from(deals).where(eq(deals.icpId, icp.id));
    if (stats) dealStats = stats;
  }

  // Product name for breadcrumb
  let productName: string | null = null;
  if (icp.productId) {
    const [p] = await db.select({ name: products.name }).from(products).where(eq(products.id, icp.productId));
    productName = p?.name ?? null;
  }

  return {
    companyName: ws.name,
    shareToken: ws.profileShareToken,
    productName,
    icp: {
      ...icp,
      criteria: icpCriteria,
      personas: icpPersonas,
      segments: icpSegments,
      dealStats,
      showStats: ws.profileShareMode === "with_stats",
    },
  };
}
