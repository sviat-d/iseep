// src/components/drafts/drafts-inbox.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Package,
  Layers,
  ArrowRight,
  Plus,
  Inbox as InboxIcon,
} from "lucide-react";

type Draft = {
  id: string;
  source: string;
  targetType: string;
  summary: string;
  status: string;
  createdAt: Date;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  create_icp: { label: "New ICP", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Target },
  update_product: { label: "Update Product", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: Package },
  update_icp: { label: "Update ICP", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Target },
  create_segment: { label: "New Segment", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: Layers },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  pending: "default",
  applied: "secondary",
  rejected: "outline",
};

const TABS = ["pending", "applied", "rejected", "all"] as const;

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DraftsInbox({ drafts: allDrafts }: { drafts: Draft[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");

  const filtered = tab === "all" ? allDrafts : allDrafts.filter((d) => d.status === tab);
  const pendingCount = allDrafts.filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Tabs + Import button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {t === "pending" && pendingCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link href="/drafts/import">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Import suggestions
          </Button>
        </Link>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <InboxIcon className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium">No suggestions yet</p>
            <p className="text-xs text-muted-foreground">
              Copy your GTM context to Claude and ask for improvements, then paste the response here
            </p>
          </div>
          <Link href="/drafts/import">
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Import suggestions
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((draft) => {
            const config = TYPE_CONFIG[draft.targetType] ?? {
              label: draft.targetType,
              color: "bg-gray-100 text-gray-800",
              icon: Target,
            };
            return (
              <Link key={draft.id} href={`/drafts/${draft.id}`} className="block">
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center gap-3 py-3">
                    <config.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="truncate text-sm font-medium">{draft.summary}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {draft.source}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[draft.status] ?? "outline"} className="text-[10px] capitalize">
                        {draft.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(draft.createdAt)}
                      </span>
                      {draft.status === "pending" && (
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
