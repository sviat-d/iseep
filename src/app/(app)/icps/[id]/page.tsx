import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcp, getIcpSnapshots, getProductsForIcp } from "@/lib/queries/icps";
import { getCasesForIcp } from "@/actions/evidence";
import { getUseCasesForProduct } from "@/actions/use-cases";
import { IcpTabs } from "@/components/icps/icp-tabs";
import { IcpDeleteDialog } from "@/components/icps/icp-delete-dialog";
import { IcpEditDialog } from "@/components/icps/icp-edit-dialog";
import { IcpShareDialog } from "@/components/icps/icp-share-dialog";
import { IcpManageProductsDialog } from "@/components/icps/icp-manage-products-dialog";
import { Badge } from "@/components/ui/badge";
import { buildIcpContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";
import { getProducts } from "@/actions/products";
import { getHypothesesForIcp } from "@/actions/hypotheses";

export default async function IcpDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  const { id } = await params;
  const { product: currentProductId } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [icp, snapshots, exportContext, icpProducts, allProducts, hypotheses] = await Promise.all([
    getIcp(id, ctx.workspaceId),
    getIcpSnapshots(id, ctx.workspaceId),
    buildIcpContext(ctx.workspaceId, id),
    getProductsForIcp(id, ctx.workspaceId),
    getProducts(ctx.workspaceId),
    getHypothesesForIcp(id, ctx.workspaceId),
  ]);

  if (!icp) notFound();

  // Determine current product — URL param or default to first linked product
  const currentProduct = currentProductId
    ? icpProducts.find((p) => p.id === currentProductId)
    : icpProducts[0] ?? null;

  // Fetch ALL cases for the ICP — filtering by product tab happens client-side
  const cases = await getCasesForIcp(id, ctx.workspaceId);

  // Get use cases only from the current product (not all linked products)
  const useCases = currentProduct
    ? await getUseCasesForProduct(currentProduct.id, ctx.workspaceId)
    : [];

  const otherProducts = icpProducts.filter((p) => p.id !== currentProduct?.id);

  // Compute product usage for safe unlink
  const productUsage: Record<string, { hypothesesCount: number; casesCount: number }> = {};
  for (const p of icpProducts) {
    let hCount = 0;
    let cCount = 0;
    for (const h of hypotheses) {
      const pids = Array.isArray(h.productIds) ? h.productIds as string[] : [];
      if (pids.includes(p.id)) hCount++;
    }
    for (const c of cases) {
      const pids = Array.isArray(c.productIds) ? c.productIds as string[] : [];
      if (pids.includes(p.id)) cCount++;
    }
    if (hCount > 0 || cCount > 0) {
      productUsage[p.id] = { hypothesesCount: hCount, casesCount: cCount };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {/* Product switcher */}
          {icpProducts.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            {icpProducts.map((p) => (
              <Link
                key={p.id}
                href={`/icps/${id}?product=${p.id}`}
                className={`rounded-full border px-2.5 py-0.5 font-medium transition-colors ${
                  p.id === currentProduct?.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.name}
              </Link>
            ))}
            {icpProducts.length > 1 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Shared
              </Badge>
            )}
            <IcpManageProductsDialog
              icpId={id}
              allProducts={allProducts.map((p) => ({ id: p.id, name: p.name }))}
              attachedProductIds={icpProducts.map((p) => p.id)}
              productUsage={productUsage}
            />
          </div>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{icp.name}</h1>
            <Badge variant="outline">{icp.status}</Badge>
            <span className="text-sm text-muted-foreground">Version {icp.version}</span>
          </div>
          {icp.description && (
            <p className="text-muted-foreground">{icp.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ContextExportButton context={exportContext} label="Copy ICP" />
          <IcpShareDialog icp={{ id: icp.id, shareToken: icp.shareToken, shareMode: icp.shareMode }} />
          <IcpEditDialog icp={icp} productCount={icpProducts.length} currentProductId={currentProduct?.id} />
          <IcpDeleteDialog icpId={icp.id} icpName={icp.name} />
        </div>
      </div>

      <IcpTabs
        icp={icp}
        snapshots={snapshots}
        cases={cases}
        hypotheses={hypotheses}
        icpProducts={icpProducts.map((p) => ({ id: p.id, name: p.name }))}
        currentProductId={currentProductId ?? currentProduct?.id}
        useCases={useCases.map((uc) => ({ id: uc.id, name: uc.name }))}
        workspaceId={ctx.workspaceId}
      />
    </div>
  );
}
