"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { countConditions, type ConditionNode } from "@/lib/segment-helpers";

type SegmentRow = {
  id: string;
  name: string;
  status: string;
  priorityScore: number;
  logicJson: unknown;
  icpId: string;
  icpName: string;
  createdAt: Date;
};

type SegmentListGroupedProps = {
  segments: SegmentRow[];
};

const STATUS_FILTERS = ["all", "draft", "active", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

export function SegmentListGrouped({ segments }: SegmentListGroupedProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered =
    filter === "all"
      ? segments
      : segments.filter((s) => s.status === filter);

  // Group by ICP name
  const grouped = new Map<string, SegmentRow[]>();
  for (const seg of filtered) {
    const key = seg.icpName;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(seg);
    } else {
      grouped.set(key, [seg]);
    }
  }

  function toggleSection(icpName: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(icpName)) {
        next.delete(icpName);
      } else {
        next.add(icpName);
      }
      return next;
    });
  }

  if (segments.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No segments yet. Create your first segment from an ICP.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status filter buttons */}
      <div className="flex gap-1">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            variant={filter === s ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No segments match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([icpName, segs]) => {
            const isCollapsed = collapsed.has(icpName);
            return (
              <div key={icpName} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection(icpName)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold">{icpName}</span>
                  <Badge variant="secondary">{segs.length}</Badge>
                </button>

                {!isCollapsed && (
                  <div className="border-t">
                    {segs.map((seg) => {
                      const conditions = countConditions(
                        seg.logicJson as ConditionNode
                      );
                      return (
                        <Link
                          key={seg.id}
                          href={`/segments/${seg.id}`}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {seg.name}
                            </span>
                            <Badge
                              variant={
                                statusVariant[seg.status] ?? "outline"
                              }
                            >
                              {seg.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{conditions} condition{conditions !== 1 ? "s" : ""}</span>
                            <span>Priority: {seg.priorityScore}/10</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
