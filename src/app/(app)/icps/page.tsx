import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getWorkspaceProducts,
  getWorkspaceIcps,
  getWorkspacePersonas,
  getWorkspaceSignals,
  getRecentHypotheses,
  getRecentCases,
} from "@/lib/queries/workspace-view";
import { WorkspaceView } from "@/components/workspace/workspace-view";

export default async function IcpsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [products, icps, personas, signals, hypotheses, cases] =
    await Promise.all([
      getWorkspaceProducts(ctx.workspaceId),
      getWorkspaceIcps(ctx.workspaceId),
      getWorkspacePersonas(ctx.workspaceId),
      getWorkspaceSignals(ctx.workspaceId),
      getRecentHypotheses(ctx.workspaceId),
      getRecentCases(ctx.workspaceId),
    ]);

  // Product id → name map for resolving JSONB product references
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return (
    <WorkspaceView
      products={products}
      icps={icps}
      personas={personas}
      signals={signals}
      hypotheses={hypotheses}
      cases={cases}
      productMap={productMap}
    />
  );
}
