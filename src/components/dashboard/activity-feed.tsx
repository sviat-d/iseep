"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Target, FileSearch, Inbox, Package, Users, Bot } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ActivityFeedProps = {
  events: Array<{
    id: string;
    eventType: string;
    entityType: string | null;
    entityId: string | null;
    summary: string;
    createdAt: Date;
    userId: string | null;
    userName: string | null;
  }>;
  currentUserId: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000,
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const EVENT_ICONS: Record<string, typeof Target> = {
  icp_created: Target,
  icp_updated: Target,
  scoring_run: FileSearch,
  draft_submitted: Inbox,
  approved: Inbox,
  rejected: Inbox,
  product_updated: Package,
  member_invited: Users,
  member_joined: Users,
};

function getEventIcon(eventType: string) {
  return EVENT_ICONS[eventType] ?? Bot;
}

function getEntityHref(
  entityType: string | null,
  entityId: string,
): string | null {
  switch (entityType) {
    case "icp":
      return `/icps/${entityId}`;
    case "upload":
      return `/scoring/${entityId}`;
    case "draft":
      return `/drafts/${entityId}`;
    default:
      return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ActivityFeed({ events, currentUserId }: ActivityFeedProps) {
  const visibleEvents = events.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet</p>
        ) : (
          <div className="space-y-1.5">
            {visibleEvents.map((event) => {
              const Icon = getEventIcon(event.eventType);
              const displayName =
                event.userId === currentUserId
                  ? "You"
                  : (event.userName ?? "Someone");
              const href =
                event.entityId
                  ? getEntityHref(event.entityType, event.entityId)
                  : null;

              const content = (
                <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{displayName}</span>{" "}
                    {event.summary}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(event.createdAt)}
                  </span>
                </div>
              );

              if (href) {
                return (
                  <Link key={event.id} href={href} className="block">
                    {content}
                  </Link>
                );
              }

              return (
                <div key={event.id}>
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
