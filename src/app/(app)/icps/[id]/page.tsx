import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcp, getIcpSnapshots } from "@/lib/queries/icps";
import { getProductContext } from "@/lib/queries/product-context";
import { getEvidenceForIcp } from "@/actions/evidence";
import { IcpTabs } from "@/components/icps/icp-tabs";
import { IcpDeleteDialog } from "@/components/icps/icp-delete-dialog";
import { IcpEditDialog } from "@/components/icps/icp-edit-dialog";
import { IcpShareDialog } from "@/components/icps/icp-share-dialog";
import { IcpProductContext } from "@/components/icps/icp-product-context";
import { Badge } from "@/components/ui/badge";
import { buildIcpContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";

export default async function IcpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [icp, snapshots, exportContext, productCtx, evidence] = await Promise.all([
    getIcp(id, ctx.workspaceId),
    getIcpSnapshots(id, ctx.workspaceId),
    buildIcpContext(ctx.workspaceId, id),
    getProductContext(ctx.workspaceId),
    getEvidenceForIcp(id, ctx.workspaceId),
  ]);

  if (!icp) notFound();

  const productData = productCtx
    ? {
        companyName: productCtx.companyName,
        productDescription: productCtx.productDescription,
        coreUseCases: (productCtx.coreUseCases as string[]) ?? [],
        keyValueProps: (productCtx.keyValueProps as string[]) ?? [],
        industriesFocus: (productCtx.industriesFocus as string[]) ?? [],
        geoFocus: (productCtx.geoFocus as string[]) ?? [],
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
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
          <IcpEditDialog icp={icp} />
          <IcpDeleteDialog icpId={icp.id} icpName={icp.name} />
        </div>
      </div>

      <IcpProductContext product={productData} />

      <IcpTabs icp={icp} snapshots={snapshots} evidence={evidence} />
    </div>
  );
}
