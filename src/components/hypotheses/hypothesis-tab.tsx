"use client";

import { useState, useTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  createHypothesis,
  updateHypothesis,
  deleteHypothesis,
} from "@/actions/hypotheses";
import type { ActionResult } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

type Hypothesis = {
  id: string;
  name: string;
  segmentId: string | null;
  personaId: string | null;
  problem: string | null;
  valueProposition: string | null;
  expectedResult: string | null;
  status: string;
  notes: string | null;
  metricsLeads: number | null;
  metricsReplies: number | null;
  metricsMeetings: number | null;
  metricsOpps: number | null;
  metricsWins: number | null;
  createdAt: Date;
};

type Segment = { id: string; name: string };
type Persona = { id: string; name: string };

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Lightbulb, variant: "secondary" as const, color: "text-muted-foreground" },
  testing: { label: "Testing", icon: FlaskConical, variant: "default" as const, color: "text-blue-600" },
  validated: { label: "Validated", icon: CheckCircle2, variant: "default" as const, color: "text-green-600" },
  rejected: { label: "Rejected", icon: XCircle, variant: "outline" as const, color: "text-red-500" },
};

const STATUS_OPTIONS = ["draft", "testing", "validated", "rejected"] as const;

// ─── Hypothesis Form Dialog ─────────────────────────────────────────────────

function HypothesisFormDialog({
  icpId,
  segments,
  personas,
  defaultValues,
  open,
  onOpenChange,
}: {
  icpId: string;
  segments: Segment[];
  personas: Persona[];
  defaultValues?: Hypothesis;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState(defaultValues?.status ?? "draft");

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    formData.set("status", status);
    let result: ActionResult;
    if (defaultValues) {
      result = await updateHypothesis(defaultValues.id, formData);
    } else {
      result = await createHypothesis(formData);
    }
    if (result.success) onOpenChange(false);
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {defaultValues ? "Edit hypothesis" : "New hypothesis"}
          </DialogTitle>
          <DialogDescription>
            A structured go-to-market assumption for a specific segment and persona.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="icpId" value={icpId} />

          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hyp-name">Name</Label>
            <Input
              id="hyp-name"
              name="name"
              placeholder="e.g., Cross-border payout pain for marketplaces"
              defaultValue={defaultValues?.name ?? ""}
              required
            />
          </div>

          {/* Segment + Persona */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hyp-segment">Segment</Label>
              <select
                id="hyp-segment"
                name="segmentId"
                defaultValue={defaultValues?.segmentId ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">None</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hyp-persona">Persona</Label>
              <select
                id="hyp-persona"
                name="personaId"
                defaultValue={defaultValues?.personaId ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">None</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Problem / Value Proposition / Expected Result */}
          <div className="space-y-1">
            <Label htmlFor="hyp-problem">Problem</Label>
            <p className="text-[11px] text-muted-foreground">What specific problem does this segment face?</p>
            <Textarea
              id="hyp-problem"
              name="problem"
              placeholder="e.g., High fees and delays on cross-border payouts to affiliates"
              defaultValue={defaultValues?.problem ?? ""}
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="hyp-vp">Our solution</Label>
            <p className="text-[11px] text-muted-foreground">How does our product solve this problem?</p>
            <Textarea
              id="hyp-vp"
              name="valueProposition"
              placeholder="e.g., Instant crypto payouts with flat fees, no banking delays"
              defaultValue={defaultValues?.valueProposition ?? ""}
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="hyp-result">Result client gets</Label>
            <p className="text-[11px] text-muted-foreground">What outcome can the client expect?</p>
            <Textarea
              id="hyp-result"
              name="expectedResult"
              placeholder="e.g., 70% cost reduction, same-day settlements globally"
              defaultValue={defaultValues?.expectedResult ?? ""}
              rows={2}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      status === s
                        ? `${cfg.color} border-current bg-current/5`
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <cfg.icon className="h-3 w-3" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metrics (only in edit mode) */}
          {defaultValues && (
            <div className="space-y-2">
              <Label>Metrics</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: "metricsLeads", label: "Leads" },
                  { name: "metricsReplies", label: "Replies" },
                  { name: "metricsMeetings", label: "Meetings" },
                  { name: "metricsOpps", label: "Opps" },
                  { name: "metricsWins", label: "Wins" },
                ].map((m) => (
                  <div key={m.name} className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">{m.label}</label>
                    <Input
                      name={m.name}
                      type="number"
                      min={0}
                      defaultValue={
                        (defaultValues[m.name as keyof Hypothesis] as number | null) ?? 0
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hyp-notes">Notes</Label>
            <Textarea
              id="hyp-notes"
              name="notes"
              placeholder="Any additional context..."
              defaultValue={defaultValues?.notes ?? ""}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : defaultValues ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hypothesis Card ────────────────────────────────────────────────────────

function HypothesisCard({
  hypothesis,
  segments,
  personas,
  onEdit,
  onDelete,
  isPending,
}: {
  hypothesis: Hypothesis;
  segments: Segment[];
  personas: Persona[];
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[hypothesis.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  const segName = hypothesis.segmentId
    ? segments.find((s) => s.id === hypothesis.segmentId)?.name
    : null;
  const personaName = hypothesis.personaId
    ? personas.find((p) => p.id === hypothesis.personaId)?.name
    : null;

  const hasMetrics =
    (hypothesis.metricsLeads ?? 0) > 0 ||
    (hypothesis.metricsMeetings ?? 0) > 0 ||
    (hypothesis.metricsWins ?? 0) > 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
              <span className="text-sm font-medium">{hypothesis.name}</span>
              <Badge variant={cfg.variant} className="text-[10px]">
                {cfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              {segName && <span>{segName}</span>}
              {segName && personaName && <span>·</span>}
              {personaName && <span>{personaName}</span>}
              {hasMetrics && (
                <>
                  <span>·</span>
                  {(hypothesis.metricsMeetings ?? 0) > 0 && (
                    <span>{hypothesis.metricsMeetings} meetings</span>
                  )}
                  {(hypothesis.metricsWins ?? 0) > 0 && (
                    <span>{hypothesis.metricsWins} wins</span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon-xs" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={onDelete} disabled={isPending}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Expand/collapse details */}
        {(hypothesis.problem || hypothesis.valueProposition || hypothesis.expectedResult || hypothesis.notes) && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Hide" : "Show"} details
            </button>
            {expanded && (
              <div className="mt-2 space-y-2 pl-5">
                {hypothesis.problem && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Problem</p>
                    <p className="text-xs">{hypothesis.problem}</p>
                  </div>
                )}
                {hypothesis.valueProposition && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Our solution</p>
                    <p className="text-xs">{hypothesis.valueProposition}</p>
                  </div>
                )}
                {hypothesis.expectedResult && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Result client gets</p>
                    <p className="text-xs">{hypothesis.expectedResult}</p>
                  </div>
                )}
                {hypothesis.notes && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="text-xs text-muted-foreground">{hypothesis.notes}</p>
                  </div>
                )}
                {hasMetrics && (
                  <div className="flex gap-4 pt-1">
                    {[
                      { label: "Leads", value: hypothesis.metricsLeads },
                      { label: "Replies", value: hypothesis.metricsReplies },
                      { label: "Meetings", value: hypothesis.metricsMeetings },
                      { label: "Opps", value: hypothesis.metricsOpps },
                      { label: "Wins", value: hypothesis.metricsWins },
                    ]
                      .filter((m) => (m.value ?? 0) > 0)
                      .map((m) => (
                        <div key={m.label} className="text-center">
                          <div className="text-sm font-semibold">{m.value}</div>
                          <div className="text-[10px] text-muted-foreground">{m.label}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Tab Component ─────────────────────────────────────────────────────

export function HypothesisTab({
  icpId,
  hypotheses,
  segments,
  personas,
}: {
  icpId: string;
  hypotheses: Hypothesis[];
  segments: Segment[];
  personas: Persona[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Hypothesis | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(h: Hypothesis) {
    setEditing(h);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHypothesis(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          Hypotheses ({hypotheses.length})
        </h3>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-3 w-3" />
          New hypothesis
        </Button>
      </div>

      {hypotheses.length === 0 ? (
        <div className="py-10 text-center">
          <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            No hypotheses yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Create go-to-market hypotheses to test with real cases.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {hypotheses.map((h) => (
            <HypothesisCard
              key={h.id}
              hypothesis={h}
              segments={segments}
              personas={personas}
              onEdit={() => handleEdit(h)}
              onDelete={() => handleDelete(h.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      <HypothesisFormDialog
        icpId={icpId}
        segments={segments}
        personas={personas}
        defaultValues={editing ?? undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
