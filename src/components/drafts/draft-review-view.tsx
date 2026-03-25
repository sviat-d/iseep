// src/components/drafts/draft-review-view.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { approveDraft, rejectDraft } from "@/actions/drafts";
import { DraftFieldDiff, CriteriaPreview, PersonaPreview } from "./draft-diff";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Loader2,
  Target,
  Package,
  Layers,
} from "lucide-react";

type DraftData = {
  id: string;
  source: string;
  targetType: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  summary: string;
  reasoning: string | null;
  status: string;
  createdAt: Date;
};

type CurrentData = {
  product?: Record<string, unknown> | null;
  icp?: Record<string, unknown> | null;
};

const TYPE_LABELS: Record<string, string> = {
  create_icp: "New ICP",
  update_product: "Update Product",
  update_icp: "Update ICP",
  create_segment: "New Segment",
};

export function DraftReviewView({
  draft,
  current,
}: {
  draft: DraftData;
  current: CurrentData;
}) {
  const router = useRouter();
  const [isApproving, startApprove] = useTransition();
  const [isRejecting, startReject] = useTransition();
  const isPending = draft.status !== "pending";

  function handleApprove() {
    startApprove(async () => {
      const result = await approveDraft(draft.id);
      if (!result.error) router.push("/drafts");
    });
  }

  function handleReject() {
    startReject(async () => {
      const result = await rejectDraft(draft.id);
      if (!result.error) router.push("/drafts");
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/drafts" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to suggestions
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{draft.summary}</h1>
          <Badge variant="outline" className="capitalize">{draft.status}</Badge>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[draft.targetType] ?? draft.targetType}</Badge>
          <span>from {draft.source}</span>
          <span>&middot;</span>
          <span>{draft.createdAt.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Reasoning */}
      {draft.reasoning && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Why this was suggested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{draft.reasoning}</p>
          </CardContent>
        </Card>
      )}

      {/* Diff section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Proposed changes</CardTitle>
        </CardHeader>
        <CardContent>
          <DraftDiffByType draft={draft} current={current} />
        </CardContent>
      </Card>

      {/* Actions */}
      {isPending ? (
        <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
          {draft.status === "applied" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {draft.status === "rejected" && <XCircle className="h-4 w-4 text-red-500" />}
          This suggestion was {draft.status}.
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button onClick={handleApprove} disabled={isApproving || isRejecting}>
            {isApproving ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Applying...</>
            ) : (
              <><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve &amp; Apply</>
            )}
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isApproving || isRejecting}>
            {isRejecting ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Rejecting...</>
            ) : (
              <><XCircle className="mr-1.5 h-4 w-4" />Reject</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Type-specific diff rendering ────────────────────────────────────────────

function DraftDiffByType({ draft, current }: { draft: DraftData; current: CurrentData }) {
  const p = draft.payload;

  switch (draft.targetType) {
    case "create_icp": {
      const criteria = (p.criteria as Array<Record<string, unknown>>) ?? [];
      const personas = (p.personas as Array<Record<string, unknown>>) ?? [];
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{p.name as string}</p>
            {!!p.description && <p className="text-xs text-muted-foreground">{String(p.description)}</p>}
          </div>
          {criteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Criteria</p>
              <CriteriaPreview criteria={criteria as Array<{ group: string; category: string; value: string; intent: string; importance?: number }>} />
            </div>
          )}
          {personas.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Personas</p>
              <PersonaPreview personas={personas as Array<{ name: string; description?: string }>} />
            </div>
          )}
        </div>
      );
    }

    case "update_product": {
      const cur = (current.product ?? {}) as Record<string, unknown>;
      const diffs = Object.entries(p)
        .filter(([, v]) => v !== undefined)
        .map(([key, proposed]) => ({
          field: key,
          current: formatValue(cur[key]),
          proposed: formatValue(proposed),
        }))
        .filter((d) => d.current !== d.proposed);
      return <DraftFieldDiff diffs={diffs} />;
    }

    case "update_icp": {
      const addCriteria = (p.addCriteria as Array<Record<string, unknown>>) ?? [];
      const removeCriteria = (p.removeCriteria as Array<Record<string, unknown>>) ?? [];
      const addPersonas = (p.addPersonas as Array<Record<string, unknown>>) ?? [];
      const removePersonas = (p.removePersonas as Array<Record<string, unknown>>) ?? [];

      const fieldDiffs: Array<{ field: string; current: string; proposed: string }> = [];
      const cur = (current.icp ?? {}) as Record<string, unknown>;
      if (p.name !== undefined) fieldDiffs.push({ field: "name", current: (cur.name as string) ?? "", proposed: p.name as string });
      if (p.description !== undefined) fieldDiffs.push({ field: "description", current: (cur.description as string) ?? "", proposed: p.description as string });

      return (
        <div className="space-y-4">
          {fieldDiffs.length > 0 && <DraftFieldDiff diffs={fieldDiffs} />}
          {addCriteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-700">Add criteria</p>
              <CriteriaPreview criteria={addCriteria as Array<{ group: string; category: string; value: string; intent: string; importance?: number }>} variant="add" />
            </div>
          )}
          {removeCriteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-red-700">Remove criteria</p>
              <CriteriaPreview criteria={(removeCriteria as Array<{ category: string; value: string }>).map((c) => ({ ...c, group: "", intent: "" }))} variant="remove" />
            </div>
          )}
          {addPersonas.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-700">Add personas</p>
              <PersonaPreview personas={addPersonas as Array<{ name: string; description?: string }>} variant="add" />
            </div>
          )}
          {removePersonas.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-red-700">Remove personas</p>
              <PersonaPreview personas={removePersonas as Array<{ name: string }>} variant="remove" />
            </div>
          )}
        </div>
      );
    }

    case "create_segment":
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{p.name as string}</p>
          {!!p.description && <p className="text-xs text-muted-foreground">{String(p.description)}</p>}
          <p className="text-xs text-muted-foreground">Linked to ICP: {p.icpId as string}</p>
        </div>
      );

    default:
      return <pre className="text-xs">{JSON.stringify(p, null, 2)}</pre>;
  }
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

// Silence unused import warnings - these are used in the type config pattern above
const _unused = { Target, Package, Layers };
void _unused;
