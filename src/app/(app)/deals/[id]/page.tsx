import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getDeal } from "@/lib/queries/deals";
import { DealDetail } from "@/components/deals/deal-detail";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const deal = await getDeal(id, ctx.workspaceId);
  if (!deal) notFound();

  return <DealDetail deal={deal} />;
}
