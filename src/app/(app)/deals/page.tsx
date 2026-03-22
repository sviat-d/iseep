import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getDeals } from "@/lib/queries/deals";
import { DealList } from "@/components/deals/deal-list";
import { Plus } from "lucide-react";

export default async function DealsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const deals = await getDeals(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">Track deals and capture win/loss insights</p>
        </div>
        <Link href="/deals/new" className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors">
          <Plus className="mr-1.5 h-4 w-4" />
          New Deal
        </Link>
      </div>
      <DealList deals={deals} />
    </div>
  );
}
