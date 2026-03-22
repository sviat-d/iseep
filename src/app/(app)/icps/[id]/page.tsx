import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcp, getIcpSnapshots } from "@/lib/queries/icps";
import { IcpTabs } from "@/components/icps/icp-tabs";
import { IcpDeleteDialog } from "@/components/icps/icp-delete-dialog";
import { IcpEditDialog } from "@/components/icps/icp-edit-dialog";
import { Badge } from "@/components/ui/badge";

export default async function IcpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const icp = await getIcp(id, ctx.workspaceId);
  if (!icp) notFound();

  const snapshots = await getIcpSnapshots(id, ctx.workspaceId);

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
          <IcpEditDialog icp={icp} />
          <IcpDeleteDialog icpId={icp.id} icpName={icp.name} />
        </div>
      </div>
      <IcpTabs icp={icp} snapshots={snapshots} />
    </div>
  );
}
