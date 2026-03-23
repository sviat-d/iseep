import { db } from "@/db";
import {
  workspaces,
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

  // Load product context
  const [product] = await db
    .select()
    .from(productContext)
    .where(eq(productContext.workspaceId, ws.id));

  // Determine which ICPs to show
  const selectedIds = ws.profileSharedIcpIds as string[] | null;

  const allIcps = selectedIds
    ? await db
        .select()
        .from(icps)
        .where(
          and(eq(icps.workspaceId, ws.id), inArray(icps.id, selectedIds)),
        )
        .orderBy(icps.name)
    : await db
        .select()
        .from(icps)
        .where(
          and(eq(icps.workspaceId, ws.id), eq(icps.status, "active")),
        )
        .orderBy(icps.name);

  // Load criteria and personas counts per ICP for cards
  const icpCards = await Promise.all(
    allIcps.map(async (icp) => {
      const icpCriteria = await db
        .select()
        .from(criteria)
        .where(eq(criteria.icpId, icp.id));

      const icpPersonas = await db
        .select()
        .from(personas)
        .where(eq(personas.icpId, icp.id));

      // Stats only if with_stats mode
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
        criteriaCount: icpCriteria.length,
        personaCount: icpPersonas.length,
        dealStats,
      };
    }),
  );

  return {
    workspace: {
      name: ws.name,
      shareMode: ws.profileShareMode,
    },
    product: product
      ? {
          companyName: product.companyName,
          website: product.website,
          productDescription: product.productDescription,
          targetCustomers: product.targetCustomers,
          coreUseCases: (product.coreUseCases as string[]) ?? [],
          keyValueProps: (product.keyValueProps as string[]) ?? [],
          industriesFocus: (product.industriesFocus as string[]) ?? [],
          geoFocus: (product.geoFocus as string[]) ?? [],
        }
      : null,
    icps: icpCards,
    showStats: ws.profileShareMode === "with_stats",
  };
}

export async function getSharedCompanyIcp(
  shareToken: string,
  icpId: string,
) {
  // Verify workspace + token
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.profileShareToken, shareToken));

  if (!ws || !ws.profileShareToken) return null;

  // Verify ICP belongs to workspace and is in shared set
  const selectedIds = ws.profileSharedIcpIds as string[] | null;
  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ws.id)));

  if (!icp) return null;

  // If specific ICPs selected, check membership
  if (selectedIds && !selectedIds.includes(icp.id)) return null;

  // If no selection, only show active ICPs
  if (!selectedIds && icp.status !== "active") return null;

  const icpCriteria = await db
    .select()
    .from(criteria)
    .where(eq(criteria.icpId, icp.id))
    .orderBy(criteria.group, criteria.category);

  const icpPersonas = await db
    .select()
    .from(personas)
    .where(eq(personas.icpId, icp.id))
    .orderBy(personas.name);

  const icpSegments = await db
    .select({
      id: segments.id,
      name: segments.name,
      status: segments.status,
      priorityScore: segments.priorityScore,
    })
    .from(segments)
    .where(eq(segments.icpId, icp.id))
    .orderBy(segments.name);

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

  // Product context for breadcrumb
  const [product] = await db
    .select({ companyName: productContext.companyName })
    .from(productContext)
    .where(eq(productContext.workspaceId, ws.id));

  return {
    companyName: product?.companyName ?? ws.name,
    shareToken: ws.profileShareToken,
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
