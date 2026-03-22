import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getRequests } from "@/lib/queries/requests";
import { getIcpsForSelect } from "@/lib/queries/icps";
import { RequestsView } from "@/components/requests/requests-view";

export default async function RequestsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const requests = await getRequests(ctx.workspaceId);
  const icps = await getIcpsForSelect(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Requests</h1>
          <p className="text-muted-foreground">Feature requests and product feedback from deals</p>
        </div>
      </div>
      <RequestsView requests={requests} icps={icps} />
    </div>
  );
}
