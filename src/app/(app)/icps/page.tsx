import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getIcps } from "@/lib/queries/icps";
import { getProductContext } from "@/lib/queries/product-context";
import { getWorkspaceShareInfo } from "@/lib/queries/workspace";
import { IcpListView } from "@/components/icps/icp-list-view";
import { IcpProductContext } from "@/components/icps/icp-product-context";
import { CompanyShareBanner } from "@/components/shared/company-share-dialog";
import { Plus, FileText } from "lucide-react";
import { buildFullContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";

export default async function IcpsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [icps, productCtx, wsShare, exportContext] = await Promise.all([
    getIcps(ctx.workspaceId),
    getProductContext(ctx.workspaceId),
    getWorkspaceShareInfo(ctx.workspaceId),
    buildFullContext(ctx.workspaceId, { product: true, icps: true, scoring: false }),
  ]);

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
      {/* Global Product Context — defines ICPs */}
      <IcpProductContext product={productData} />

      {/* Company Profile Sharing */}
      <CompanyShareBanner
        profileShareToken={wsShare?.profileShareToken ?? null}
        profileShareMode={wsShare?.profileShareMode ?? null}
        profileSharedIcpIds={
          (wsShare?.profileSharedIcpIds as string[] | null) ?? null
        }
        allIcps={icps.map((i) => ({
          id: i.id,
          name: i.name,
          status: i.status,
        }))}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ICPs</h1>
          <p className="text-muted-foreground">
            Define and manage your Ideal Customer Profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContextExportButton context={exportContext} label="Copy all ICPs" />
          <Link
            href="/icps/import"
            className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-colors"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Import
          </Link>
          <Link
            href="/icps/new"
            className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create ICP
          </Link>
        </div>
      </div>
      <IcpListView icps={icps} />
    </div>
  );
}
