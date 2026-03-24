import { notFound } from "next/navigation";
import Link from "next/link";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">About your product</h1>
          <p className="text-muted-foreground">
            Help iseep understand what you sell so it can suggest better ICPs and segments
          </p>
        </div>
        {context && <ContextExportButton context={exportContext} label="Copy product context" />}
      </div>
      <ProductContextForm
        defaultValues={context}
        rejectedIndustries={rejectedIndustries}
      />

      <div className="border-t pt-4 text-sm text-muted-foreground">
        Looking for AI settings?{" "}
        <Link
          href="/settings/ai"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Configure AI keys &rarr;
        </Link>
      </div>
    </div>
  );
}
