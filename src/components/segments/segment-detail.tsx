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
import { parseLogicJson } from "@/lib/segment-helpers";

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
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

export function SegmentDetail({ segment }: SegmentDetailProps) {
  const [editMode, setEditMode] = useState(false);
  const logic = parseLogicJson(segment.logicJson);

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
              Edit rules
            </Button>
          )}
          <SegmentDeleteDialog
            segmentId={segment.id}
            segmentName={segment.name}
          />
        </div>
      </div>

      {/* Rules display */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Rules</h2>
        {editMode ? (
          <SegmentBuilder
            segmentId={segment.id}
            initialLogic={logic}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <SegmentReadView logic={logic} />
        )}
      </div>
    </div>
  );
}
