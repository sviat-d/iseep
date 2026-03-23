import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getIcps } from "@/lib/queries/icps";
import { getProductContext } from "@/lib/queries/product-context";
import { getWorkspaceShareInfo } from "@/lib/queries/workspace";
import { IcpListView } from "@/components/icps/icp-list-view";
import { ProductContextNudge } from "@/components/shared/product-context-nudge";
import { CompanyShareBanner } from "@/components/shared/company-share-dialog";
import { Plus, FileText } from "lucide-react";

export default async function IcpsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [icps, productCtx, wsShare] = await Promise.all([
    getIcps(ctx.workspaceId),
    getProductContext(ctx.workspaceId),
    getWorkspaceShareInfo(ctx.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      {!productCtx && <ProductContextNudge />}

      {/* Company Profile Sharing — prominent banner */}
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
