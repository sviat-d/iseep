import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcp, getIcpSnapshots } from "@/lib/queries/icps";
import { getCasesForIcp } from "@/actions/evidence";
import { IcpTabs } from "@/components/icps/icp-tabs";
import { IcpDeleteDialog } from "@/components/icps/icp-delete-dialog";
import { IcpEditDialog } from "@/components/icps/icp-edit-dialog";
import { IcpShareDialog } from "@/components/icps/icp-share-dialog";
import { Badge } from "@/components/ui/badge";
import { buildIcpContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function IcpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [icp, snapshots, exportContext, cases] = await Promise.all([
    getIcp(id, ctx.workspaceId),
    getIcpSnapshots(id, ctx.workspaceId),
    buildIcpContext(ctx.workspaceId, id),
    getCasesForIcp(id, ctx.workspaceId),
  ]);

  if (!icp) notFound();

  // Fetch parent product name
  let productName: string | null = null;
  if (icp.productId) {
    const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, icp.productId));
    productName = product?.name ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {productName && (
            <Link
              href={`/icps?product=${icp.productId}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {productName} &rarr;
            </Link>
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
          <IcpEditDialog icp={icp} />
          <IcpDeleteDialog icpId={icp.id} icpName={icp.name} />
        </div>
      </div>

      <IcpTabs icp={icp} snapshots={snapshots} cases={cases} />
    </div>
  );
}
