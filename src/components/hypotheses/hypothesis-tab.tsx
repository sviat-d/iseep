"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
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
  Check,
  AlertTriangle,
  ShieldOff,
} from "lucide-react";
import {
  createHypothesis,
  updateHypothesis,
  deleteHypothesis,
} from "@/actions/hypotheses";
import type { ActionResult } from "@/lib/types";
import { PROPERTY_OPTIONS } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

type Hypothesis = {
  id: string;
  name: string;
  selectedCriteriaIds: unknown;
  selectedPersonaIds: unknown;
  problem: string | null;
  solution: string | null;
  outcome: string | null;
  // legacy fields
  valueProposition: string | null;
  expectedResult: string | null;
  status: string;
  notes: string | null;
  recipients: number | null;
  positiveReplies: number | null;
  sqls: number | null;
  wonDeals: number | null;
  lostDeals: number | null;
  // legacy
  metricsLeads: number | null;
  metricsReplies: number | null;
  metricsMeetings: number | null;
  metricsOpps: number | null;
  metricsWins: number | null;
  createdAt: Date;
};

type CriterionItem = {
  id: string;
  category: string;
  value: string;
  intent: string;
  weight: number | null;
};

type PersonaItem = { id: string; name: string };

function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  return [];
}

function getCriterionLabel(c: CriterionItem): string {
  const propLabel = PROPERTY_OPTIONS.find((p) => p.category === c.category)?.label ?? c.category;
  return `${propLabel}: ${c.value}`;
}

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Lightbulb, variant: "secondary" as const, color: "text-muted-foreground" },
  testing: { label: "Testing", icon: FlaskConical, variant: "default" as const, color: "text-blue-600" },
  validated: { label: "Validated", icon: CheckCircle2, variant: "default" as const, color: "text-green-600" },
  rejected: { label: "Rejected", icon: XCircle, variant: "outline" as const, color: "text-red-500" },
};

const STATUS_OPTIONS = ["draft", "testing", "validated", "rejected"] as const;

const INTENT_CONFIG = {
  qualify: { label: "Good fit", icon: Check, color: "text-green-600" },
  risk: { label: "Risk", icon: AlertTriangle, color: "text-amber-500" },
  exclude: { label: "Not a fit", icon: ShieldOff, color: "text-red-500" },
};

// ─── Hypothesis Form Dialog ─────────────────────────────────────────────────

function HypothesisFormDialog({
  icpId,
  icpName,
  criteria,
  personas,
  defaultValues,
  open,
  onOpenChange,
}: {
  icpId: string;
  icpName: string;
  criteria: CriterionItem[];
  personas: PersonaItem[];
  defaultValues?: Hypothesis;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState(defaultValues?.status ?? "draft");
  const [selectedCriteria, setSelectedCriteria] = useState<Set<string>>(
    new Set(asStringArray(defaultValues?.selectedCriteriaIds)),
  );
  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(
    new Set(asStringArray(defaultValues?.selectedPersonaIds)),
  );
  const [formRecipients, setFormRecipients] = useState(defaultValues?.recipients ?? 0);
  const [formReplies, setFormReplies] = useState(defaultValues?.positiveReplies ?? 0);
  const [formSqls, setFormSqls] = useState(defaultValues?.sqls ?? 0);

  useEffect(() => {
    setStatus(defaultValues?.status ?? "draft");
    setSelectedCriteria(new Set(asStringArray(defaultValues?.selectedCriteriaIds)));
    setSelectedPersonas(new Set(asStringArray(defaultValues?.selectedPersonaIds)));
    setFormRecipients(defaultValues?.recipients ?? 0);
    setFormReplies(defaultValues?.positiveReplies ?? 0);
    setFormSqls(defaultValues?.sqls ?? 0);
  }, [defaultValues, open]);

  function toggleCriterion(id: string) {
    setSelectedCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePersona(id: string) {
    setSelectedPersonas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    formData.set("status", status);
    formData.set("selectedCriteriaIds", JSON.stringify(Array.from(selectedCriteria)));
    formData.set("selectedPersonaIds", JSON.stringify(Array.from(selectedPersonas)));
    let result: ActionResult;
    if (defaultValues) {
      result = await updateHypothesis(defaultValues.id, formData);
    } else {
      result = await createHypothesis(formData);
    }
    if (result.success) onOpenChange(false);
    return result;
  }, null);

  const qualify = criteria.filter((c) => c.intent === "qualify");
  const risk = criteria.filter((c) => c.intent === "risk");
  const exclude = criteria.filter((c) => c.intent === "exclude");

  // Resolve legacy solution/outcome from old fields
  const defaultSolution = defaultValues?.solution ?? defaultValues?.valueProposition ?? "";
  const defaultOutcome = defaultValues?.outcome ?? defaultValues?.expectedResult ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {defaultValues ? "Edit hypothesis" : "Create hypothesis"}
          </DialogTitle>
          <DialogDescription>
            Select criteria and personas from this ICP, then define the angle you want to test.
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

          <div>
            <span className="text-xs text-muted-foreground">ICP:</span>{" "}
            <Badge variant="outline" className="text-xs">{icpName}</Badge>
          </div>

          {/* Included criteria */}
          <div className="space-y-2">
            <Label>Included criteria</Label>
            {criteria.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No criteria yet. Add criteria in the Criteria tab first.
              </p>
            ) : (
              <div className="space-y-3">
                {([
                  { key: "qualify", items: qualify },
                  { key: "risk", items: risk },
                  { key: "exclude", items: exclude },
                ] as const)
                  .filter((g) => g.items.length > 0)
                  .map((group) => {
                    const cfg = INTENT_CONFIG[group.key];
                    const Icon = cfg.icon;
                    return (
                      <div key={group.key}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Icon className={`h-3 w-3 ${cfg.color}`} />
                          <span className="text-[11px] font-medium text-muted-foreground">{cfg.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((c) => {
                            const isSelected = selectedCriteria.has(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleCriterion(c.id)}
                                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {getCriterionLabel(c)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Personas */}
          <div className="space-y-2">
            <Label>Personas</Label>
            {personas.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                No personas yet. Add personas in the Personas tab first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {personas.map((p) => {
                  const isSelected = selectedPersonas.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePersona(p.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Narrative */}
          <div className="space-y-1">
            <Label htmlFor="hyp-problem">Problem</Label>
            <p className="text-[11px] text-muted-foreground">What specific problem does this audience face?</p>
            <Textarea
              id="hyp-problem"
              name="problem"
              placeholder="e.g., High fees and delays on cross-border payouts to affiliates"
              defaultValue={defaultValues?.problem ?? ""}
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="hyp-solution">Our solution</Label>
            <p className="text-[11px] text-muted-foreground">How does our product solve this?</p>
            <Textarea
              id="hyp-solution"
              name="solution"
              placeholder="e.g., Instant crypto payouts with flat fees, no banking delays"
              defaultValue={defaultSolution}
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="hyp-outcome">Expected outcome</Label>
            <p className="text-[11px] text-muted-foreground">What result can the client expect?</p>
            <Textarea
              id="hyp-outcome"
              name="outcome"
              placeholder="e.g., 70% cost reduction, same-day settlements globally"
              defaultValue={defaultOutcome}
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

          {/* Outreach metrics */}
          <div className="space-y-2">
            <Label>Outreach metrics</Label>
            <div className="grid grid-cols-5 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Recipients</label>
                <Input name="recipients" type="number" min={0} value={formRecipients} onChange={(e) => setFormRecipients(Number(e.target.value) || 0)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Positive replies</label>
                <Input name="positiveReplies" type="number" min={0} value={formReplies} onChange={(e) => setFormReplies(Number(e.target.value) || 0)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">SQLs</label>
                <Input name="sqls" type="number" min={0} value={formSqls} onChange={(e) => setFormSqls(Number(e.target.value) || 0)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Won deals</label>
                <Input name="wonDeals" type="number" min={0} defaultValue={defaultValues ? ((defaultValues.wonDeals as number | null) ?? 0) : 0} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Lost deals</label>
                <Input name="lostDeals" type="number" min={0} defaultValue={defaultValues ? ((defaultValues.lostDeals as number | null) ?? 0) : 0} className="h-8 text-xs" />
              </div>
            </div>
            {formRecipients > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                {formReplies > 0 && (
                  <span>Reply rate: <span className="font-medium text-foreground">{Math.round((formReplies / formRecipients) * 100)}%</span></span>
                )}
                {formSqls > 0 && (
                  <span>SQL conversion: <span className="font-medium text-foreground">{Math.round((formSqls / formRecipients) * 100)}%</span></span>
                )}
              </div>
            )}
          </div>

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

type LinkedCase = {
  id: string;
  companyName: string;
  outcome: string;
  dealValue: string | null;
};

function HypothesisCard({
  hypothesis,
  criteria,
  personas,
  linkedCases,
  onEdit,
  onDelete,
  isPending,
}: {
  hypothesis: Hypothesis;
  criteria: CriterionItem[];
  personas: PersonaItem[];
  linkedCases: LinkedCase[];
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[hypothesis.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;

  const critIds = asStringArray(hypothesis.selectedCriteriaIds);
  const personaIds = asStringArray(hypothesis.selectedPersonaIds);
  const selectedCriteria = criteria.filter((c) => critIds.includes(c.id));
  const selectedPersonas = personas.filter((p) => personaIds.includes(p.id));

  const problem = hypothesis.problem;
  const solution = hypothesis.solution ?? hypothesis.valueProposition;
  const outcome = hypothesis.outcome ?? hypothesis.expectedResult;

  const recipients = hypothesis.recipients ?? 0;
  const positiveReplies = hypothesis.positiveReplies ?? 0;
  const replyRate = recipients > 0 ? Math.round((positiveReplies / recipients) * 100) : 0;
  const hasMetrics = recipients > 0 || (hypothesis.sqls ?? 0) > 0 || (hypothesis.wonDeals ?? 0) > 0;

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
              {critIds.length > 0 && (
                <span>{critIds.length} criteria</span>
              )}
              {personaIds.length > 0 && (
                <>
                  {critIds.length > 0 && <span>·</span>}
                  <span>{personaIds.length} persona{personaIds.length > 1 ? "s" : ""}</span>
                </>
              )}
              {linkedCases.length > 0 && (
                <>
                  {(critIds.length > 0 || personaIds.length > 0) && <span>·</span>}
                  <span>{linkedCases.length} case{linkedCases.length > 1 ? "s" : ""}</span>
                </>
              )}
              {recipients > 0 && (hypothesis.sqls ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span className="font-medium text-foreground">
                    {Math.round(((hypothesis.sqls ?? 0) / recipients) * 100)}% SQL conversion
                  </span>
                </>
              )}
              {recipients > 0 && replyRate > 0 && !(hypothesis.sqls && hypothesis.sqls > 0) && (
                <>
                  <span>·</span>
                  <span>{replyRate}% reply rate</span>
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

        {(selectedCriteria.length > 0 || selectedPersonas.length > 0 || problem || solution || outcome || hypothesis.notes || hasMetrics || linkedCases.length > 0) && (
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
                {selectedCriteria.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Criteria</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCriteria.map((c) => (
                        <Badge key={c.id} variant="secondary" className="text-[10px]">
                          {getCriterionLabel(c)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPersonas.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Personas</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedPersonas.map((p) => (
                        <Badge key={p.id} variant="outline" className="text-[10px]">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {problem && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Problem</p>
                    <p className="text-xs">{problem}</p>
                  </div>
                )}
                {solution && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Our solution</p>
                    <p className="text-xs">{solution}</p>
                  </div>
                )}
                {outcome && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Expected outcome</p>
                    <p className="text-xs">{outcome}</p>
                  </div>
                )}
                {hypothesis.notes && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="text-xs text-muted-foreground">{hypothesis.notes}</p>
                  </div>
                )}
                {hasMetrics && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Outreach funnel</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-medium">{recipients} recipients</span>
                      {replyRate > 0 && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span>{positiveReplies} positive replies <span className="text-muted-foreground">({replyRate}%)</span></span>
                        </>
                      )}
                      {(hypothesis.sqls ?? 0) > 0 && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span>{hypothesis.sqls} SQLs {recipients > 0 && <span className="text-muted-foreground">({Math.round(((hypothesis.sqls ?? 0) / recipients) * 100)}%)</span>}</span>
                        </>
                      )}
                    </div>
                    {((hypothesis.wonDeals ?? 0) > 0 || (hypothesis.lostDeals ?? 0) > 0) && (
                      <div className="flex items-center gap-3 text-xs">
                        {(hypothesis.wonDeals ?? 0) > 0 && (
                          <span className="text-green-600">{hypothesis.wonDeals} won</span>
                        )}
                        {(hypothesis.lostDeals ?? 0) > 0 && (
                          <span className="text-red-500">{hypothesis.lostDeals} lost</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {linkedCases.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Linked cases ({linkedCases.filter((c) => c.outcome === "won").length} won, {linkedCases.filter((c) => c.outcome === "lost").length} lost{linkedCases.filter((c) => c.outcome === "in_progress").length > 0 ? `, ${linkedCases.filter((c) => c.outcome === "in_progress").length} in progress` : ""})
                    </p>
                    <div className="space-y-0.5">
                      {linkedCases.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <span className={
                            c.outcome === "won" ? "text-green-600" :
                            c.outcome === "lost" ? "text-red-500" : "text-blue-500"
                          }>
                            {c.outcome === "won" ? "W" : c.outcome === "lost" ? "L" : "→"}
                          </span>
                          <span>{c.companyName}</span>
                          {c.dealValue && (
                            <span className="text-muted-foreground">${Number(c.dealValue).toLocaleString()}</span>
                          )}
                        </div>
                      ))}
                    </div>
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
  icpName,
  hypotheses,
  criteria,
  personas,
  linkedCasesMap = {},
}: {
  icpId: string;
  icpName: string;
  hypotheses: Hypothesis[];
  criteria: CriterionItem[];
  personas: PersonaItem[];
  linkedCasesMap?: Record<string, LinkedCase[]>;
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
              criteria={criteria}
              personas={personas}
              linkedCases={linkedCasesMap[h.id] ?? []}
              onEdit={() => handleEdit(h)}
              onDelete={() => handleDelete(h.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      <HypothesisFormDialog
        icpId={icpId}
        icpName={icpName}
        criteria={criteria}
        personas={personas}
        defaultValues={editing ?? undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
