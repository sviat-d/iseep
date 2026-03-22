import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getCompanies } from "@/lib/queries/deals";
import { getIcpsForSelect } from "@/lib/queries/icps";
import { createDeal } from "@/actions/deals";
import { DealForm } from "@/components/deals/deal-form";

export default async function NewDealPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const companies = await getCompanies(ctx.workspaceId);
  const icps = await getIcpsForSelect(ctx.workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Deal</h1>
        <p className="text-muted-foreground">Create a new deal and link it to your ICP</p>
      </div>
      <DealForm action={createDeal} companies={companies} icps={icps} />
    </div>
  );
}
