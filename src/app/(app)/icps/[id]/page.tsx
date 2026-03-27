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
import { Badge } from "@/components/ui/badge";
import { buildIcpContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";

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

  const [icp, snapshots, exportContext, icpProducts] = await Promise.all([
    getIcp(id, ctx.workspaceId),
    getIcpSnapshots(id, ctx.workspaceId),
    buildIcpContext(ctx.workspaceId, id),
    getProductsForIcp(id, ctx.workspaceId),
  ]);

  if (!icp) notFound();

  // Determine current product — URL param or default to first linked product
  const currentProduct = currentProductId
    ? icpProducts.find((p) => p.id === currentProductId)
    : icpProducts[0] ?? null;

  // Fetch cases scoped to the resolved product (not just the URL param)
  const cases = await getCasesForIcp(id, ctx.workspaceId, currentProduct?.id);

  // Get use cases only from the current product (not all linked products)
  const useCases = currentProduct
    ? await getUseCasesForProduct(currentProduct.id, ctx.workspaceId)
    : [];

  const otherProducts = icpProducts.filter((p) => p.id !== currentProduct?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {/* Product usage block */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {currentProduct && (
              <Link
                href={`/icps?product=${currentProduct.id}`}
                className="hover:text-foreground transition-colors"
              >
                {currentProduct.name}
              </Link>
            )}
            {otherProducts.length > 0 && (
              <span>
                · Also in: {otherProducts.map((p) => p.name).join(", ")}
              </span>
            )}
            {icpProducts.length > 1 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Shared
              </Badge>
            )}
          </div>
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
        currentProductId={currentProductId ?? currentProduct?.id}
        useCases={useCases.map((uc) => ({ id: uc.id, name: uc.name }))}
        workspaceId={ctx.workspaceId}
      />
    </div>
  );
}
