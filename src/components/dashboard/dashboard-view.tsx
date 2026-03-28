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
  Plus,
  ArrowRight,
  FileSearch,
  Lightbulb,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

// ─── Types ──────────────────────────────────────────────────────────────────

type IcpOverviewItem = {
  id: string;
  name: string;
  productName: string | null;
  status: string;
  version: number;
  qualifyCount: number;
  excludeCount: number;
  personaCount: number;
  evidenceCount: number;
  updatedAt: Date;
};

type ActivityEvent = {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  createdAt: Date;
  userId: string | null;
  userName: string | null;
};

export type DashboardViewProps = {
  icps: IcpOverviewItem[];
  hasProductContext: boolean;
  activityEvents?: ActivityEvent[];
  currentUserId?: string;
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

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ hasProductContext }: { hasProductContext: boolean }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to iseep
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your ICP workspace is empty. Start by defining your product context,
            then create your first Ideal Customer Profile.
          </p>
        </div>

        {!hasProductContext && (
          <Link
            href="/icps"
            className="mx-auto flex items-start gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10 max-w-sm"
          >
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Set up product context</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tell iseep about your product so it can generate better ICPs
              </p>
            </div>
          </Link>
        )}

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
            href="/icps/import"
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
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export function DashboardView({
  icps,
  hasProductContext,
  activityEvents,
  currentUserId,
}: DashboardViewProps) {
  if (icps.length === 0) {
    return <EmptyState hasProductContext={hasProductContext} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Product context nudge */}
      {!hasProductContext && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-muted-foreground">
            Set up your product context for smarter ICPs —{" "}
            <Link
              href="/icps"
              className="font-medium text-foreground hover:underline"
            >
              Go to Product & ICPs
            </Link>
          </p>
        </div>
      )}

      {/* ICP Overview — PRIMARY block */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your ICPs</h2>
          <Link
            href="/icps"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {icps.map((icp) => (
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
                <CardDescription className="flex items-center gap-2">
                  <Badge variant={statusVariant[icp.status] ?? "outline"}>
                    {icp.status}
                  </Badge>
                  <span className="text-xs">v{icp.version}</span>
                  {icp.productName && (
                    <span className="text-[10px] text-muted-foreground/60">{icp.productName}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{icp.qualifyCount + icp.excludeCount} criteria</span>
                  <span>{icp.personaCount} personas</span>
                  {icp.evidenceCount > 0 && (
                    <span>{icp.evidenceCount} evidence</span>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                  Updated {timeAgo(icp.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Link
            href="/icps/new"
            className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="h-4 w-4 text-primary" />
            Create ICP
          </Link>
          <Link
            href="/icps/import"
            className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <FileText className="h-4 w-4 text-primary" />
            Import ICP
          </Link>
          <Link
            href="/scoring"
            className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <FileSearch className="h-4 w-4 text-muted-foreground" />
            Test ICP on leads
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
              Beta
            </Badge>
          </Link>
        </CardContent>
      </Card>

      {/* Activity Feed — secondary */}
      {activityEvents && activityEvents.length > 0 && currentUserId && (
        <ActivityFeed events={activityEvents} currentUserId={currentUserId} />
      )}
    </div>
  );
}
