import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getProductContext } from "@/lib/queries/product-context";
import { getRejectedIcps } from "@/actions/reject-icp";
import { ProductContextForm } from "@/components/settings/product-context-form";
import { buildProductContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";

export default async function ProductContextPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [context, rejected, exportContext] = await Promise.all([
    getProductContext(ctx.workspaceId),
    getRejectedIcps(ctx.workspaceId),
    buildProductContext(ctx.workspaceId),
  ]);

  const rejectedIndustries = rejected.map(r => ({
    industry: r.industry,
    reason: r.reason,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Help iseep understand what you sell so it can suggest better ICPs and segments
        </p>
        {context && <ContextExportButton context={exportContext} label="Copy product context" />}
      </div>
      <ProductContextForm
        defaultValues={context}
        rejectedIndustries={rejectedIndustries}
      />
    </div>
  );
}
