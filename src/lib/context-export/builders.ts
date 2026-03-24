import type { GtmContextPackage, ExportModules } from "./types";
import { getProductContext } from "@/lib/queries/product-context";
import { getIcps, getIcp } from "@/lib/queries/icps";
import { getScoredUploads, getScoredLeadStats } from "@/lib/queries/scoring";
import { getWorkspaceName } from "@/lib/queries/workspace";

export async function buildFullContext(
  workspaceId: string,
  modules: ExportModules = {},
): Promise<GtmContextPackage> {
  const {
    product: includeProduct = true,
    icps: includeIcps = true,
    scoring: includeScoring = true,
  } = modules;

  const workspaceName = await getWorkspaceName(workspaceId);

  const pkg: GtmContextPackage = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace: { name: workspaceName },
  };

  if (includeProduct) {
    const ctx = await getProductContext(workspaceId);
    if (ctx) {
      pkg.product = {
        companyName: ctx.companyName,
        website: ctx.website,
        productDescription: ctx.productDescription,
        targetCustomers: ctx.targetCustomers,
        coreUseCases: (ctx.coreUseCases as string[]) ?? [],
        keyValueProps: (ctx.keyValueProps as string[]) ?? [],
        industriesFocus: (ctx.industriesFocus as string[]) ?? [],
        geoFocus: (ctx.geoFocus as string[]) ?? [],
      };
    }
  }

  if (includeIcps) {
    const allIcps = await getIcps(workspaceId);
    const activeIcps = allIcps.filter((i) => i.status === "active");

    if (activeIcps.length > 0) {
      const detailed = await Promise.all(
        activeIcps.map((i) => getIcp(i.id, workspaceId)),
      );

      pkg.icps = detailed
        .filter((d) => d !== null)
        .map((d) => ({
          name: d.name,
          description: d.description,
          status: d.status,
          version: d.version,
          criteria: d.criteria.map((c) => ({
            group: c.group,
            category: c.category,
            value: c.value,
            intent: c.intent,
            weight: c.weight,
          })),
          personas: d.personas.map((p) => ({
            name: p.name,
            description: p.description,
          })),
        }));
    }
  }

  if (includeScoring) {
    const uploads = await getScoredUploads(workspaceId);
    pkg.scoring = { totalRuns: uploads.length };

    if (uploads.length > 0) {
      const latest = uploads[0];
      const stats = await getScoredLeadStats(latest.id, workspaceId);
      pkg.scoring.latestRun = {
        fileName: latest.fileName,
        scoredAt: latest.scoredAt.toISOString(),
        totalLeads: latest.totalRows,
        breakdown: {
          high: stats.high,
          medium: stats.medium,
          low: stats.low,
          risk: stats.risk,
          blocked: stats.blocked,
          unmatched: stats.none,
        },
      };
    }
  }

  return pkg;
}

export async function buildProductContext(
  workspaceId: string,
): Promise<GtmContextPackage> {
  return buildFullContext(workspaceId, {
    product: true,
    icps: false,
    scoring: false,
  });
}

export async function buildIcpContext(
  workspaceId: string,
  icpId: string,
): Promise<GtmContextPackage> {
  const workspaceName = await getWorkspaceName(workspaceId);
  const ctx = await getProductContext(workspaceId);
  const icp = await getIcp(icpId, workspaceId);

  const pkg: GtmContextPackage = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace: { name: workspaceName },
  };

  if (ctx) {
    pkg.product = {
      companyName: ctx.companyName,
      website: ctx.website,
      productDescription: ctx.productDescription,
      targetCustomers: ctx.targetCustomers,
      coreUseCases: (ctx.coreUseCases as string[]) ?? [],
      keyValueProps: (ctx.keyValueProps as string[]) ?? [],
      industriesFocus: (ctx.industriesFocus as string[]) ?? [],
      geoFocus: (ctx.geoFocus as string[]) ?? [],
    };
  }

  if (icp) {
    pkg.icps = [
      {
        name: icp.name,
        description: icp.description,
        status: icp.status,
        version: icp.version,
        criteria: icp.criteria.map((c) => ({
          group: c.group,
          category: c.category,
          value: c.value,
          intent: c.intent,
          weight: c.weight,
        })),
        personas: icp.personas.map((p) => ({
          name: p.name,
          description: p.description,
        })),
      },
    ];
  }

  return pkg;
}
