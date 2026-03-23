"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  FileText,
  Sparkles,
  BarChart3,
  Plus,
  ArrowRight,
  Upload,
  ClipboardList,
  Lightbulb,
} from "lucide-react";
import { ProductContextNudge } from "@/components/shared/product-context-nudge";

// ─── Types ──────────────────────────────────────────────────────────────────

type DashboardState = {
  hasIcps: boolean;
  hasScoringRuns: boolean;
  hasDeals: boolean;
  icpCount: number;
  scoringRunCount: number;
  dealCount: number;
};

type DashboardStats = {
  activeIcps: number;
  activeSegments: number;
  openDeals: number;
  wonDeals: number;
  closedDeals: number;
} | null;

type IcpHealthItem = {
  id: string;
  name: string;
  status: string;
  version: number;
  qualifyCount: number;
  excludeCount: number;
  personaCount: number;
  dealTotal: number;
  dealWon: number;
  dealLost: number;
  dealOpen: number;
  updatedAt: Date;
};

type LatestRun = {
  upload: {
    id: string;
    fileName: string;
    totalRows: number;
    createdAt: Date;
  };
  stats: {
    total: number;
    high: number;
    medium: number;
    low: number;
    risk: number;
    blocked: number;
    none: number;
  };
} | null;

type RecentActivityItem = {
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
};

export type DashboardViewProps = {
  state: DashboardState;
  stats: DashboardStats;
  icpHealth: IcpHealthItem[];
  latestRun: LatestRun;
  recentActivity: RecentActivityItem[];
  hasProductContext?: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getIcpValidationStatus(
  icp: IcpHealthItem,
  hasScoringRuns: boolean
): { label: string; variant: "default" | "secondary" | "outline" } {
  const hasCriteria = icp.qualifyCount > 0 || icp.excludeCount > 0;
  const hasDeals = icp.dealWon > 0;

  if (hasDeals && hasScoringRuns) {
    return { label: "Validated", variant: "default" };
  }
  if (hasCriteria && hasScoringRuns) {
    return { label: "Tested", variant: "secondary" };
  }
  if (hasCriteria) {
    return { label: "Untested", variant: "outline" };
  }
  return { label: "New", variant: "outline" };
}

// ─── State A: Empty workspace ───────────────────────────────────────────────

function EmptyState({ hasProductContext }: { hasProductContext?: boolean }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to iseep
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your ICP workspace is empty. Start by creating your first Ideal
            Customer Profile.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/icps/new"
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-6 text-center transition-colors hover:bg-muted"
          >
            <Target className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">Create ICP manually</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Define your ideal customer step by step
              </p>
            </div>
          </Link>

          <Link
            href="/icps/new?mode=import"
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-6 text-center transition-colors hover:bg-muted"
          >
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">Import from text/file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Paste a description or upload a document
              </p>
            </div>
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Or explore with sample data:
          </p>
          <Link
            href="/icps/new?mode=sample"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Sparkles className="h-4 w-4" />
            Try sample ICP + leads
          </Link>
        </div>

        {!hasProductContext && (
          <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-left">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="text-muted-foreground">
                Tip: Tell iseep about your product for smarter ICP suggestions
              </p>
              <Link
                href="/settings/product"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1"
              >
                Set up product context
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── State B: Has ICPs, no scoring ──────────────────────────────────────────

function HasIcpsState({
  icpHealth,
  hasProductContext,
}: {
  icpHealth: IcpHealthItem[];
  hasProductContext?: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {!hasProductContext && <ProductContextNudge />}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Your ICPs are set up. Now test them on real data.
        </h1>
        <p className="mt-2 text-muted-foreground">
          <Target className="mr-1 inline h-4 w-4" />
          Active ICPs: {icpHealth.length}
          {icpHealth.length > 0 && (
            <span className="ml-1 text-foreground">
              ({icpHealth.map((i) => i.name).join(", ")})
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What to do next</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/scoring/upload"
            className="flex items-start gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <Upload className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Upload your lead list</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Upload a CSV (conference attendees, scraped leads, outbound list) and instantly see which ones match your ICP
              </p>
            </div>
          </Link>

          <Link
            href="/scoring?mode=sample"
            className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted"
          >
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">No CSV yet? Try sample data</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Instantly score 20 example companies to see how scoring works
              </p>
            </div>
          </Link>

          <Link
            href="/icps/new"
            className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted sm:col-span-2"
          >
            <Plus className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Create another ICP</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add more profiles to compare against your leads
              </p>
            </div>
          </Link>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href="/icps"
          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          View ICPs <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/icps"
          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          Edit criteria <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── State C/D: Has scoring runs (main state) ──────────────────────────────

function MainDashboard({
  state,
  icpHealth,
  latestRun,
  recentActivity,
  hasProductContext,
}: DashboardViewProps) {
  return (
    <div className="space-y-6">
      {!hasProductContext && <ProductContextNudge />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link
          href="/scoring"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Score new list
        </Link>
      </div>

      {/* Latest Scoring Run */}
      {latestRun && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Latest scoring run: &ldquo;{latestRun.upload.fileName}&rdquo;
              <span className="font-normal text-muted-foreground">
                &middot; {latestRun.upload.totalRows} leads
              </span>
            </CardTitle>
            <CardDescription>{timeAgo(latestRun.upload.createdAt)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {latestRun.stats.high > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {latestRun.stats.high} High fit
                </span>
              )}
              {(latestRun.stats.medium + latestRun.stats.low + latestRun.stats.risk) > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                  {latestRun.stats.medium + latestRun.stats.low + latestRun.stats.risk} Borderline
                </span>
              )}
              {latestRun.stats.blocked > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                  {latestRun.stats.blocked} Blocked
                </span>
              )}
              {latestRun.stats.none > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
                  {latestRun.stats.none} Unmatched
                </span>
              )}

              <Link
                href={`/scoring/${latestRun.upload.id}`}
                className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View full results <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Fit level bar */}
            {latestRun.stats.total > 0 && (
              <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                {latestRun.stats.high > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{
                      width: `${(latestRun.stats.high / latestRun.stats.total) * 100}%`,
                    }}
                  />
                )}
                {latestRun.stats.medium > 0 && (
                  <div
                    className="bg-amber-500"
                    style={{
                      width: `${(latestRun.stats.medium / latestRun.stats.total) * 100}%`,
                    }}
                  />
                )}
                {latestRun.stats.low > 0 && (
                  <div
                    className="bg-orange-400"
                    style={{
                      width: `${(latestRun.stats.low / latestRun.stats.total) * 100}%`,
                    }}
                  />
                )}
                {latestRun.stats.risk > 0 && (
                  <div
                    className="bg-rose-400"
                    style={{
                      width: `${(latestRun.stats.risk / latestRun.stats.total) * 100}%`,
                    }}
                  />
                )}
                {latestRun.stats.blocked > 0 && (
                  <div
                    className="bg-red-600"
                    style={{
                      width: `${(latestRun.stats.blocked / latestRun.stats.total) * 100}%`,
                    }}
                  />
                )}
                {latestRun.stats.none > 0 && (
                  <div
                    className="bg-gray-300 dark:bg-gray-600"
                    style={{
                      width: `${(latestRun.stats.none / latestRun.stats.total) * 100}%`,
                    }}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ICP Health */}
      {icpHealth.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">ICP Health</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {icpHealth.map((icp) => {
              const validation = getIcpValidationStatus(icp, state.hasScoringRuns);
              const closed = icp.dealWon + icp.dealLost;
              const winRate =
                closed > 0
                  ? `${Math.round((icp.dealWon / closed) * 100)}%`
                  : null;

              return (
                <Card key={icp.id} size="sm">
                  <CardHeader>
                    <CardTitle>
                      <Link
                        href={`/icps/${icp.id}`}
                        className="hover:underline"
                      >
                        {icp.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      <Badge variant={validation.variant}>
                        {validation.label}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        {icp.qualifyCount} criteria &middot;{" "}
                        {icp.excludeCount} exclusions
                      </p>
                      {state.hasDeals && (
                        <p>
                          {icp.dealTotal} deals
                          {winRate && (
                            <span className="ml-1 font-medium text-foreground">
                              &middot; {winRate} win rate
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest ICP updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/icps/${item.id}`}
                        className="hover:underline"
                      >
                        {item.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(item.updatedAt)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href="/scoring"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              Score new list
            </Link>
            <Link
              href="/icps/new"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Create ICP
            </Link>
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Lightbulb className="h-4 w-4" />
              View insights
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DashboardView(props: DashboardViewProps) {
  const { state, icpHealth, hasProductContext } = props;

  // State A: empty workspace
  if (!state.hasIcps) {
    return <EmptyState hasProductContext={hasProductContext} />;
  }

  // State B: has ICPs but no scoring runs
  if (!state.hasScoringRuns) {
    return <HasIcpsState icpHealth={icpHealth} hasProductContext={hasProductContext} />;
  }

  // State C/D: has scoring runs (with or without deals)
  return <MainDashboard {...props} />;
}
