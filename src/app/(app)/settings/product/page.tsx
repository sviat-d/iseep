import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getProductContext } from "@/lib/queries/product-context";
import { getRejectedIcps } from "@/actions/reject-icp";
import { ProductContextForm } from "@/components/settings/product-context-form";

export default async function ProductContextPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [context, rejected] = await Promise.all([
    getProductContext(ctx.workspaceId),
    getRejectedIcps(ctx.workspaceId),
  ]);

  const rejectedIndustries = rejected.map(r => ({
    industry: r.industry,
    reason: r.reason,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">About your product</h1>
        <p className="text-muted-foreground">
          Help iseep understand what you sell so it can suggest better ICPs and segments
        </p>
      </div>
      <ProductContextForm
        defaultValues={context}
        rejectedIndustries={rejectedIndustries}
      />
    </div>
  );
}
