import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getWinLossByIcp,
  getWinLossBySegment,
  getTopLossReasons,
  getTopRequestsByIcp,
} from "@/lib/queries/insights";
import { InsightsView } from "@/components/insights/insights-view";

export default async function InsightsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [winLossByIcp, winLossBySegment, topLossReasons, requestsByIcp] = await Promise.all([
    getWinLossByIcp(ctx.workspaceId),
    getWinLossBySegment(ctx.workspaceId),
    getTopLossReasons(ctx.workspaceId),
    getTopRequestsByIcp(ctx.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">Win/loss patterns and product feedback analysis</p>
      </div>
      <InsightsView
        winLossByIcp={winLossByIcp}
        winLossBySegment={winLossBySegment}
        topLossReasons={topLossReasons}
        requestsByIcp={requestsByIcp}
      />
    </div>
  );
}
