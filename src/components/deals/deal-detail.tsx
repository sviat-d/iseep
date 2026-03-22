"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealEditDialog } from "@/components/deals/deal-edit-dialog";
import { DealDeleteDialog } from "@/components/deals/deal-delete-dialog";
import { DealReasonDialog } from "@/components/deals/deal-reason-dialog";
import { MeetingNoteDialog } from "@/components/deals/meeting-note-dialog";
import { deleteDealReason } from "@/actions/deal-reasons";
import { deleteMeetingNote } from "@/actions/meeting-notes";
import { Trash2 } from "lucide-react";

type DealDetailProps = {
  deal: {
    id: string;
    title: string;
    workspaceId: string;
    icpId: string | null;
    personaId: string | null;
    segmentId: string | null;
    companyId: string;
    contactId: string | null;
    dealValue: string | null;
    currency: string | null;
    stage: string | null;
    outcome: string;
    closedAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    company: {
      id: string;
      name: string;
      website: string | null;
      country: string | null;
      industry: string | null;
    };
    contact: {
      id: string;
      fullName: string;
      title: string | null;
      email: string | null;
    } | null;
    icp: {
      id: string;
      name: string;
    } | null;
    segment: {
      id: string;
      name: string;
    } | null;
    reasons: Array<{
      id: string;
      dealId: string;
      reasonType: string;
      category: string;
      tag: string;
      description: string | null;
      severity: number | null;
      createdAt: Date;
    }>;
    meetingNotes: Array<{
      id: string;
      dealId: string | null;
      summary: string;
      sourceType: string | null;
      createdAt: Date;
    }>;
  };
};

const outcomeBadgeClass: Record<string, string> = {
  won: "bg-emerald-600 text-white",
  lost: "",
  open: "",
};

const outcomeVariant: Record<string, "default" | "destructive" | "secondary"> = {
  won: "default",
  lost: "destructive",
  open: "secondary",
};

const reasonTypeVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  win: "default",
  loss: "destructive",
  objection: "secondary",
  general: "outline",
};

const reasonTypeClass: Record<string, string> = {
  win: "bg-emerald-600 text-white",
};

const sourceTypeVariant: Record<string, "default" | "secondary" | "outline"> = {
  manual: "secondary",
  notetaker: "default",
  import: "outline",
};

export function DealDetail({ deal }: DealDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{deal.title}</h1>
            <Badge
              variant={outcomeVariant[deal.outcome] ?? "secondary"}
              className={outcomeBadgeClass[deal.outcome]}
            >
              {deal.outcome}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{deal.stage ?? "discovery"}</span>
            <span>&middot;</span>
            <span>{deal.company.name}</span>
            {deal.icp && (
              <>
                <span>&middot;</span>
                <span>{deal.icp.name}</span>
              </>
            )}
            {deal.dealValue && (
              <>
                <span>&middot;</span>
                <span>
                  {deal.currency ?? "USD"} {Number(deal.dealValue).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <DealEditDialog deal={deal} />
          <DealDeleteDialog dealId={deal.id} dealTitle={deal.title} />
        </div>
      </div>

      {/* Deal Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Stage</dt>
              <dd className="capitalize font-medium">{deal.stage ?? "discovery"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Outcome</dt>
              <dd className="font-medium capitalize">{deal.outcome}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Value</dt>
              <dd className="font-medium">
                {deal.dealValue
                  ? `${deal.currency ?? "USD"} ${Number(deal.dealValue).toLocaleString()}`
                  : "--"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Company</dt>
              <dd className="font-medium">{deal.company.name}</dd>
            </div>
            {deal.icp && (
              <div>
                <dt className="text-muted-foreground">ICP</dt>
                <dd className="font-medium">{deal.icp.name}</dd>
              </div>
            )}
            {deal.segment && (
              <div>
                <dt className="text-muted-foreground">Segment</dt>
                <dd className="font-medium">{deal.segment.name}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">
                {new Date(deal.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {deal.closedAt && (
              <div>
                <dt className="text-muted-foreground">Closed</dt>
                <dd className="font-medium">
                  {new Date(deal.closedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            {deal.notes && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium whitespace-pre-wrap">{deal.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Win/Loss Reasons Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Win/Loss Reasons</CardTitle>
          <DealReasonDialog dealId={deal.id} />
        </CardHeader>
        <CardContent>
          {deal.reasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reasons added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {deal.reasons.map((reason) => (
                <ReasonItem key={reason.id} reason={reason} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Notes Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meeting Notes</CardTitle>
          <MeetingNoteDialog dealId={deal.id} />
        </CardHeader>
        <CardContent>
          {deal.meetingNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No meeting notes yet.
            </p>
          ) : (
            <div className="space-y-3">
              {deal.meetingNotes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReasonItem({
  reason,
}: {
  reason: {
    id: string;
    reasonType: string;
    category: string;
    tag: string;
    description: string | null;
    severity: number | null;
    createdAt: Date;
  };
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteDealReason(reason.id);
    });
  }

  return (
    <div className="flex items-start justify-between rounded-md border border-border p-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge
            variant={reasonTypeVariant[reason.reasonType] ?? "outline"}
            className={reasonTypeClass[reason.reasonType]}
          >
            {reason.reasonType}
          </Badge>
          <span className="text-sm font-medium">{reason.category}</span>
          <span className="text-xs text-muted-foreground">{reason.tag}</span>
          {reason.severity != null && (
            <span className="text-xs text-muted-foreground">
              Severity: {reason.severity}/5
            </span>
          )}
        </div>
        {reason.description && (
          <p className="text-sm text-muted-foreground">{reason.description}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function NoteItem({
  note,
}: {
  note: {
    id: string;
    summary: string;
    sourceType: string | null;
    createdAt: Date;
  };
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteMeetingNote(note.id);
    });
  }

  return (
    <div className="flex items-start justify-between rounded-md border border-border p-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant={sourceTypeVariant[note.sourceType ?? "manual"] ?? "secondary"}>
            {note.sourceType ?? "manual"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(note.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{note.summary}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
