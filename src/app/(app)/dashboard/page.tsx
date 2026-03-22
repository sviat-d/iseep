import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getDashboardState,
  getDashboardStats,
  getIcpHealth,
  getRecentActivity,
  getLatestScoringRun,
} from "@/lib/queries/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [state, stats, icpHealth, latestRun, recentActivity] =
    await Promise.all([
      getDashboardState(ctx.workspaceId),
      getDashboardStats(ctx.workspaceId),
      getIcpHealth(ctx.workspaceId),
      getLatestScoringRun(ctx.workspaceId),
      getRecentActivity(ctx.workspaceId),
    ]);

  return (
    <DashboardView
      state={state}
      stats={stats}
      icpHealth={icpHealth}
      latestRun={latestRun}
      recentActivity={recentActivity}
    />
  );
}
