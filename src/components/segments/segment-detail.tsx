"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentReadView } from "@/components/segments/segment-read-view";
import { SegmentBuilder } from "@/components/segments/segment-builder";
import { SegmentEditDialog } from "@/components/segments/segment-edit-dialog";
import { SegmentDeleteDialog } from "@/components/segments/segment-delete-dialog";
import { ArrowLeft, Pencil } from "lucide-react";
import type { ConditionNode } from "@/lib/segment-helpers";

type Criterion = {
  id: string;
  group: string;
  category: string;
  operator: string | null;
  value: string;
  intent: string;
  weight: number | null;
  note: string | null;
};

type Segment = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priorityScore: number;
  logicJson: unknown;
  icpId: string;
  icpName: string;
  personaId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SegmentDetailProps = {
  segment: Segment;
  icpCriteria: Criterion[];
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

export function SegmentDetail({ segment, icpCriteria }: SegmentDetailProps) {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/segments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Segments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {segment.name}
            </h1>
            <Badge variant={statusVariant[segment.status] ?? "outline"}>
              {segment.status}
            </Badge>
          </div>
          {segment.description && (
            <p className="text-sm text-muted-foreground">
              {segment.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Priority: {segment.priorityScore}/10</span>
            <span>
              ICP:{" "}
              <Link
                href={`/icps/${segment.icpId}`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {segment.icpName}
              </Link>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SegmentEditDialog segment={segment} />
          {!editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit conditions
            </Button>
          )}
          <SegmentDeleteDialog
            segmentId={segment.id}
            segmentName={segment.name}
          />
        </div>
      </div>

      {/* Condition display */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Conditions</h2>
        {editMode ? (
          <SegmentBuilder
            segmentId={segment.id}
            initialLogicJson={segment.logicJson as ConditionNode}
            icpCriteria={icpCriteria}
            icpId={segment.icpId}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <SegmentReadView logicJson={segment.logicJson as ConditionNode} />
        )}
      </div>
    </div>
  );
}
