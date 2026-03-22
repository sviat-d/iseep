import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getDashboardStats, getIcpHealth, getRecentActivity, MIN_DEALS_FOR_CONFIDENCE } from "@/lib/queries/dashboard";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Target, Layers, Handshake, BarChart3, Plus } from "lucide-react";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const stats = await getDashboardStats(ctx.workspaceId);
  const icpHealth = await getIcpHealth(ctx.workspaceId);
  const recentActivity = await getRecentActivity(ctx.workspaceId);

  const winRate = stats.closedDeals > 0
    ? `${Math.round((stats.wonDeals / stats.closedDeals) * 100)}% (${stats.wonDeals}/${stats.closedDeals})`
    : "—";

  const statCards = [
    { label: "Active ICPs", value: String(stats.activeIcps), icon: Target },
    { label: "Active Segments", value: String(stats.activeSegments), icon: Layers },
    { label: "Open Deals", value: String(stats.openDeals), icon: Handshake },
    { label: "Win Rate", value: winRate, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your ICP workspace at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ICP Health */}
      {icpHealth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ICP Health</CardTitle>
            <CardDescription>Active ICPs with criteria and deal performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {icpHealth.map((icp) => {
                const closed = icp.dealWon + icp.dealLost;
                const wr = closed > 0
                  ? `${Math.round((icp.dealWon / closed) * 100)}% (${icp.dealWon}/${closed})`
                  : "—";
                return (
                  <div key={icp.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <Link href={`/icps/${icp.id}`} className="font-medium hover:underline">
                        {icp.name}
                      </Link>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{icp.qualifyCount} criteria</span>
                        <span>{icp.excludeCount} exclusions</span>
                        <span>{icp.personaCount} personas</span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{icp.dealOpen} open</span>
                        <span>{icp.dealWon} won</span>
                        <span>{icp.dealLost} lost</span>
                      </div>
                      <div className={cn("font-medium", closed < MIN_DEALS_FOR_CONFIDENCE && "text-muted-foreground")}>
                        {wr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest ICP updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet. Start by creating your first ICP.
              </p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <Link href={`/icps/${item.id}`} className="hover:underline">
                      {item.name}
                    </Link>
                    <Badge variant="outline" className="text-xs">{item.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link href="/icps/new" className="inline-flex items-center justify-start rounded-lg px-2.5 h-8 text-sm font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-colors w-full">
              <Plus className="mr-2 h-4 w-4" /> Create ICP
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
