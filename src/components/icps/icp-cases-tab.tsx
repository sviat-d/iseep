"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Briefcase,
  Pencil,
} from "lucide-react";
import { addCase, deleteCase, updateCase, findRelatedCases } from "@/actions/evidence";
import { createUseCase } from "@/actions/use-cases";

// ─── Types ──────────────────────────────────────────────────────────────────

type CaseItem = {
  id: string;
  companyName: string;
  companyDomain: string | null;
  outcome: string;
  segmentId: string | null;
  useCaseId: string | null;
  useCaseIds: unknown;
  channel: string | null;
  channelDetail: string | null;
  reasonTags: unknown;
  hypothesis: string | null;
  hypothesisId: string | null;
  note: string | null;
  createdAt: Date;
};

type Segment = {
  id: string;
  name: string;
};

type UseCase = {
  id: string;
  name: string;
};

type HypothesisRef = {
  id: string;
  name: string;
};

// ─── Reason tags by outcome ─────────────────────────────────────────────────

const TAGS_WON = [
  "Strong ICP fit",
  "High volume",
  "Urgent need",
  "Crypto-ready",
  "Cross-border pain",
  "Good margins",
  "Strong operational fit",
  "Fast decision process",
  "Clear use case",
  "Compliance fit",
];

const TAGS_LOST = [
  "Not ICP fit",
  "No urgency",
  "Budget mismatch",
  "Compliance issue",
  "Not crypto-ready",
  "Wrong region",
  "Too small",
  "Too large",
  "Wrong use case",
  "Pricing mismatch",
];

const TAGS_IN_PROGRESS = [
  "Early interest",
  "Qualified",
  "Waiting on follow-up",
  "In evaluation",
  "Compliance review",
  "Technical discussion",
];

function getTagsForOutcome(outcome: string) {
  if (outcome === "won") return TAGS_WON;
  if (outcome === "lost") return TAGS_LOST;
  if (outcome === "in_progress") return TAGS_IN_PROGRESS;
  return [];
}

const CHANNELS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "conference", label: "Conference" },
  { value: "referral", label: "Referral" },
  { value: "inbound", label: "Inbound" },
  { value: "other", label: "Other" },
] as const;

const outcomeConfig = {
  won: { label: "Won", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10" },
  lost: { label: "Lost", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  in_progress: { label: "In progress", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
} as const;

// ─── Add Case Form ──────────────────────────────────────────────────────────

function AddCaseForm({
  icpId,
  segments,
  hypotheses = [],
  productId,
  useCases,
  workspaceId,
  onClose,
}: {
  icpId: string;
  segments: Segment[];
  hypotheses?: HypothesisRef[];
  productId?: string;
  useCases: UseCase[];
  workspaceId?: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<string>("");
  const [selectedUseCaseIds, setSelectedUseCaseIds] = useState<string[]>([]);
  const [useCaseSearch, setUseCaseSearch] = useState("");
  const [localUseCases, setLocalUseCases] = useState(useCases);
  const [channel, setChannel] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [relatedCases, setRelatedCases] = useState<Array<{ id: string; companyName: string; outcome: string; note: string | null; reasonTags: unknown; productId: string | null }>>([]);
  const [companyValue, setCompanyValue] = useState("");
  const [lookupTimer, setLookupTimer] = useState<NodeJS.Timeout | null>(null);

  function handleCompanyChange(value: string) {
    setCompanyValue(value);
    // Debounced lookup for related cases
    if (lookupTimer) clearTimeout(lookupTimer);
    if (value.trim().length >= 3 && workspaceId) {
      const timer = setTimeout(() => {
        findRelatedCases(value, workspaceId, productId).then((cases) => {
          setRelatedCases(cases);
        });
      }, 500);
      setLookupTimer(timer);
    } else {
      setRelatedCases([]);
    }
  }

  function handleReuseDraft(relatedCase: typeof relatedCases[0]) {
    setCompanyValue(relatedCase.companyName);
    if (relatedCase.outcome) setOutcome(relatedCase.outcome);
    if (relatedCase.note) setShowAdvanced(true);
    const tags = Array.isArray(relatedCase.reasonTags) ? (relatedCase.reasonTags as string[]) : [];
    if (tags.length > 0) setSelectedTags(tags);
    setRelatedCases([]);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSubmit(formData: FormData) {
    formData.set("outcome", outcome);
    formData.set("channel", channel);
    formData.set("segmentId", selectedSegment);
    formData.set("useCaseIds", selectedUseCaseIds.join(","));
    formData.set("reasonTags", selectedTags.join(","));
    startTransition(async () => {
      await addCase(formData);
      onClose();
    });
  }

  const suggestedTags = getTagsForOutcome(outcome);

  return (
    <Card>
      <CardContent className="pt-4">
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="icpId" value={icpId} />
          {productId && <input type="hidden" name="productId" value={productId} />}

          {/* Step 1: Company */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Company *</label>
            <Input
              name="companyName"
              value={companyValue}
              onChange={(e) => handleCompanyChange(e.target.value)}
              placeholder="Company name or domain"
              required
              className="mt-1"
              autoFocus
            />
            {/* Related cases from other products */}
            {relatedCases.length > 0 && (
              <div className="mt-2 rounded-md border bg-muted/30 p-2 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground">Related cases found in other products</p>
                {relatedCases.map((rc) => {
                  const rcCfg = outcomeConfig[rc.outcome as keyof typeof outcomeConfig];
                  return (
                    <div key={rc.id} className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/50">
                      <div className="flex items-center gap-2 text-xs">
                        {rcCfg && <rcCfg.icon className={`h-3 w-3 ${rcCfg.color}`} />}
                        <span>{rc.companyName}</span>
                        <span className="text-muted-foreground">{rc.outcome}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReuseDraft(rc)}
                        className="text-[10px] font-medium text-primary hover:underline"
                      >
                        Reuse as draft
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Outcome */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Outcome *</label>
            <div className="mt-1.5 flex gap-2">
              {(["won", "lost", "in_progress"] as const).map((o) => {
                const cfg = outcomeConfig[o];
                const selected = outcome === o;
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      setOutcome(o);
                      setSelectedTags([]);
                    }}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <cfg.icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Segment */}
          {segments.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Segment
                <span className="ml-1 text-[10px] font-normal text-muted-foreground/60">recommended</span>
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {segments.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setSelectedSegment(selectedSegment === seg.id ? "" : seg.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedSegment === seg.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {seg.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Use Case — select or create */}
          {(localUseCases.length > 0 || useCaseSearch) ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Use case</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {localUseCases
                  .filter((uc) => !useCaseSearch || uc.name.toLowerCase().includes(useCaseSearch.toLowerCase()))
                  .map((uc) => (
                    <button
                      key={uc.id}
                      type="button"
                      onClick={() => setSelectedUseCaseIds((prev) =>
                        prev.includes(uc.id) ? prev.filter((id) => id !== uc.id) : [...prev, uc.id]
                      )}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        selectedUseCaseIds.includes(uc.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {uc.name}
                    </button>
                  ))}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <Input
                  value={useCaseSearch}
                  onChange={(e) => setUseCaseSearch(e.target.value)}
                  placeholder="Search or create new..."
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && useCaseSearch.trim()) {
                      e.preventDefault();
                      const trimmed = useCaseSearch.trim();
                      startTransition(async () => {
                        if (!productId) return;
                        const result = await createUseCase(productId, trimmed);
                        if (result.success && result.useCaseId) {
                          setLocalUseCases((prev) => {
                            if (prev.some((uc) => uc.id === result.useCaseId)) return prev;
                            return [...prev, { id: result.useCaseId!, name: trimmed }];
                          });
                          setSelectedUseCaseIds((prev) => [...prev, result.useCaseId!]);
                          setUseCaseSearch("");
                        }
                      });
                    }
                  }}
                />
                {useCaseSearch.trim() && !localUseCases.some((uc) => uc.name.toLowerCase() === useCaseSearch.trim().toLowerCase()) && (
                  <button
                    type="button"
                    className="rounded border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
                    onClick={() => {
                      const trimmed = useCaseSearch.trim();
                      startTransition(async () => {
                        if (!productId) return;
                        const result = await createUseCase(productId, trimmed);
                        if (result.success && result.useCaseId) {
                          setLocalUseCases((prev) => [...prev, { id: result.useCaseId!, name: trimmed }]);
                          setSelectedUseCaseIds((prev) => [...prev, result.useCaseId!]);
                          setUseCaseSearch("");
                        }
                      });
                    }}
                  >
                    + Create &ldquo;{useCaseSearch.trim()}&rdquo;
                  </button>
                )}
              </div>
            </div>
          ) : productId ? (
            <button
              type="button"
              onClick={() => setUseCaseSearch("")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add use case (optional)
            </button>
          ) : null}

          {/* Step 4: Channel */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Channel</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => setChannel(channel === ch.value ? "" : ch.value)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    channel === ch.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 5: Channel detail (dynamic) */}
          {(channel === "conference" || channel === "other") && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {channel === "conference" ? "Conference name" : "Channel details"}
              </label>
              <Input
                name="channelDetail"
                placeholder={channel === "conference" ? "e.g., Money20/20, Web Summit" : "e.g., Partner portal, Cold call"}
                className="mt-1"
              />
            </div>
          )}

          {/* Step 6: Reason tags (outcome-aware) */}
          {outcome && suggestedTags.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Why?</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${outcomeConfig[outcome as keyof typeof outcomeConfig]?.bg ?? ""} ${outcomeConfig[outcome as keyof typeof outcomeConfig]?.color ?? ""} border-current`}
                  >
                    {tag}
                    <X className="h-2.5 w-2.5" />
                  </button>
                ))}
                {suggestedTags
                  .filter((t) => !selectedTags.includes(t))
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Step 7: Advanced (collapsed) */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            {showAdvanced ? "Hide" : "More"} details
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              {hypotheses.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Hypothesis</label>
                  <select
                    name="hypothesisId"
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="">None</option>
                    {hypotheses.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Note</label>
                <Textarea
                  name="note"
                  rows={2}
                  placeholder="Any extra context..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !outcome}>
              {isPending ? "Adding..." : "Add case"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

// ─── Edit Case Inline ───────────────────────────────────────────────────────

function EditCaseInline({
  caseItem,
  icpId,
  segments,
  hypotheses = [],
  useCases,
  productId,
  onClose,
}: {
  caseItem: CaseItem;
  icpId: string;
  segments: Segment[];
  hypotheses?: HypothesisRef[];
  useCases: UseCase[];
  productId?: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const tags = Array.isArray(caseItem.reasonTags) ? (caseItem.reasonTags as string[]) : [];
  const [outcome, setOutcome] = useState(caseItem.outcome);
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const existingUcIds = Array.isArray(caseItem.useCaseIds) ? (caseItem.useCaseIds as string[]) : caseItem.useCaseId ? [caseItem.useCaseId] : [];
  const [selectedUseCaseIds, setSelectedUseCaseIds] = useState<string[]>(existingUcIds);
  const [channel, setChannel] = useState(caseItem.channel ?? "");
  const [selectedSegment, setSelectedSegment] = useState(caseItem.segmentId ?? "");

  function toggleTag(tag: string) {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function handleSubmit(formData: FormData) {
    formData.set("outcome", outcome);
    formData.set("channel", channel);
    formData.set("segmentId", selectedSegment);
    formData.set("useCaseIds", selectedUseCaseIds.join(","));
    formData.set("reasonTags", selectedTags.join(","));
    startTransition(async () => {
      await updateCase(caseItem.id, icpId, formData);
      onClose();
    });
  }

  const suggestedTags = getTagsForOutcome(outcome);

  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <form action={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company *</label>
              <Input name="companyName" defaultValue={caseItem.companyName} required className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Outcome *</label>
              <div className="mt-1.5 flex gap-2">
                {(["won", "lost", "in_progress"] as const).map((o) => {
                  const cfg = outcomeConfig[o];
                  return (
                    <button key={o} type="button" onClick={() => { setOutcome(o); setSelectedTags([]); }}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${outcome === o ? `${cfg.bg} ${cfg.color} border-current` : "border-border text-muted-foreground hover:bg-muted"}`}>
                      <cfg.icon className="h-3 w-3" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {segments.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Segment</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {segments.map((seg) => (
                  <button key={seg.id} type="button" onClick={() => setSelectedSegment(selectedSegment === seg.id ? "" : seg.id)}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${selectedSegment === seg.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {seg.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {useCases.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Use case</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {useCases.map((uc) => (
                  <button key={uc.id} type="button" onClick={() => setSelectedUseCaseIds((prev) => prev.includes(uc.id) ? prev.filter((id) => id !== uc.id) : [...prev, uc.id])}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${selectedUseCaseIds.includes(uc.id) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {uc.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestedTags.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Why?</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {suggestedTags.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${selectedTags.includes(tag) ? `${outcomeConfig[outcome as keyof typeof outcomeConfig]?.bg ?? ""} ${outcomeConfig[outcome as keyof typeof outcomeConfig]?.color ?? ""} border-current` : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {hypotheses.length > 0 ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hypothesis</label>
                <select
                  name="hypothesisId"
                  defaultValue={caseItem.hypothesisId ?? ""}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="">None</option>
                  {hypotheses.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hypothesis</label>
                <Input name="hypothesis" defaultValue={caseItem.hypothesis ?? ""} className="mt-1" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Note</label>
              <Input name="note" defaultValue={caseItem.note ?? ""} className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function IcpCasesTab({
  icpId,
  cases,
  segments,
  hypotheses = [],
  productId,
  useCases = [],
  workspaceId,
}: {
  icpId: string;
  cases: CaseItem[];
  segments: Segment[];
  hypotheses?: HypothesisRef[];
  productId?: string;
  useCases?: UseCase[];
  workspaceId?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "won" | "lost" | "in_progress">("all");
  const [useCaseFilter, setUseCaseFilter] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const counts = {
    won: cases.filter((c) => c.outcome === "won").length,
    lost: cases.filter((c) => c.outcome === "lost").length,
    in_progress: cases.filter((c) => c.outcome === "in_progress").length,
  };

  const filtered = cases
    .filter((c) => filter === "all" || c.outcome === filter)
    .filter((c) => {
      if (!useCaseFilter) return true;
      const ucIds = Array.isArray(c.useCaseIds) ? (c.useCaseIds as string[]) : c.useCaseId ? [c.useCaseId] : [];
      return ucIds.includes(useCaseFilter);
    });

  // Build segment name lookup
  const segmentMap = new Map(segments.map((s) => [s.id, s.name]));
  const hypothesisMap = new Map(hypotheses.map((h) => [h.id, h.name]));
  const useCaseMap = new Map(useCases.map((uc) => [uc.id, uc.name]));

  function handleDelete(caseId: string) {
    startTransition(async () => {
      await deleteCase(caseId, icpId);
    });
  }

  return (
    <div className="space-y-4">
      {/* Counters + filters */}
      <div className="flex items-center gap-4">
        {counts.won > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-medium">{counts.won}</span>
            <span className="text-muted-foreground">won</span>
          </div>
        )}
        {counts.lost > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="font-medium">{counts.lost}</span>
            <span className="text-muted-foreground">lost</span>
          </div>
        )}
        {counts.in_progress > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{counts.in_progress}</span>
            <span className="text-muted-foreground">in progress</span>
          </div>
        )}
        {cases.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            {(["all", "won", "lost", "in_progress"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f === "all" ? "All" : f === "won" ? "Won" : f === "lost" ? "Lost" : "In progress"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Use case filter */}
      {useCases.length > 0 && cases.some((c) => {
        const ucIds = Array.isArray(c.useCaseIds) ? (c.useCaseIds as string[]) : c.useCaseId ? [c.useCaseId] : [];
        return ucIds.length > 0;
      }) && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setUseCaseFilter("")}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              !useCaseFilter ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All use cases
          </button>
          {useCases.filter((uc) => cases.some((c) => {
            const ucIds = Array.isArray(c.useCaseIds) ? (c.useCaseIds as string[]) : c.useCaseId ? [c.useCaseId] : [];
            return ucIds.includes(uc.id);
          })).map((uc) => (
            <button
              key={uc.id}
              type="button"
              onClick={() => setUseCaseFilter(useCaseFilter === uc.id ? "" : uc.id)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                useCaseFilter === uc.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {uc.name}
            </button>
          ))}
        </div>
      )}

      {/* Add case button */}
      {!showForm && (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add case
        </Button>
      )}

      {/* Add case form */}
      {showForm && (
        <AddCaseForm
          icpId={icpId}
          segments={segments}
          hypotheses={hypotheses}
          productId={productId}
          useCases={useCases}
          workspaceId={workspaceId}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Cases list */}
      {filtered.length === 0 && !showForm ? (
        <div className="py-10 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            No cases yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Cases help validate your ICP with real examples from the market.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const tags = Array.isArray(c.reasonTags) ? (c.reasonTags as string[]) : [];
            const cfg = outcomeConfig[c.outcome as keyof typeof outcomeConfig] ?? outcomeConfig.in_progress;
            const Icon = cfg.icon;
            const segName = c.segmentId ? segmentMap.get(c.segmentId) : null;
            const ucIds = Array.isArray(c.useCaseIds) ? (c.useCaseIds as string[]) : c.useCaseId ? [c.useCaseId] : [];
            const ucNames = ucIds.map((id) => useCaseMap.get(id)).filter(Boolean) as string[];

            if (editingCaseId === c.id) {
              return (
                <EditCaseInline
                  key={c.id}
                  caseItem={c}
                  icpId={icpId}
                  segments={segments}
                  hypotheses={hypotheses}
                  useCases={useCases}
                  productId={productId}
                  onClose={() => setEditingCaseId(null)}
                />
              );
            }

            return (
              <div key={c.id} className="flex items-start gap-3 rounded-lg border px-4 py-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{c.companyName}</span>
                    {segName && (
                      <Badge variant="outline" className="text-[10px]">{segName}</Badge>
                    )}
                    {ucNames.map((name) => (
                      <Badge key={name} variant="secondary" className="text-[10px]">{name}</Badge>
                    ))}
                    {c.channel && c.channel !== "other" && (
                      <Badge variant="secondary" className="text-[10px]">
                        {c.channel}
                        {c.channelDetail && `: ${c.channelDetail}`}
                      </Badge>
                    )}
                    {c.channel === "other" && c.channelDetail && (
                      <Badge variant="secondary" className="text-[10px]">{c.channelDetail}</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className={`text-[10px] ${cfg.bg} ${cfg.color}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(c.hypothesisId ? hypothesisMap.get(c.hypothesisId) : c.hypothesis) && (
                    <p className="text-xs text-muted-foreground italic">
                      {c.hypothesisId ? hypothesisMap.get(c.hypothesisId) : c.hypothesis}
                    </p>
                  )}
                  {c.note && (
                    <p className="text-xs text-muted-foreground">{c.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setEditingCaseId(c.id)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
