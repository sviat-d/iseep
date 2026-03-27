"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteCriterion } from "@/actions/criteria";
import { CriterionFormDialog } from "@/components/criteria/criterion-form-dialog";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  EXCLUSIONS_DESCRIPTION,
  EXCLUSION_EMPTY_SUGGESTIONS,
  RISK_DESCRIPTION,
  RISK_EMPTY_SUGGESTIONS,
} from "@/lib/constants";

type Criterion = {
  id: string;
  group: string;
  category: string;
  operator: string | null;
  value: string;
  intent: string;
  weight: number | null;
  note: string | null;
  workspaceId: string;
  icpId: string | null;
  personaId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Visual grouping (human-friendly, not system-driven) ──────────────────────

const VISUAL_GROUPS: Array<{
  key: string;
  label: string;
  match: (c: Criterion) => boolean;
}> = [
  {
    key: "company",
    label: "Company",
    match: (c) => c.group === "firmographic",
  },
  {
    key: "product-tech",
    label: "Product & Tech",
    match: (c) => c.group === "technographic",
  },
  {
    key: "growth",
    label: "Growth",
    match: (c) => c.group === "behavioral",
  },
  {
    key: "compliance",
    label: "Compliance",
    match: (c) => c.group === "compliance",
  },
  {
    key: "keywords",
    label: "Keywords",
    match: (c) => c.group === "keyword",
  },
];

// Key basics for completeness tracking
const KEY_BASICS = ["industry", "region", "company_size", "business_model"];
const KEY_BASICS_LABELS: Record<string, string> = {
  industry: "Industry",
  region: "Region",
  company_size: "Company size",
  business_model: "Business model",
};

// ─── Criterion Row ────────────────────────────────────────────────────────────

function CriterionRow({
  criterion,
  onEdit,
  onDelete,
  isPending,
}: {
  criterion: Criterion;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [showNote, setShowNote] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3 text-sm min-w-0">
          {criterion.intent === "qualify" && (
            <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
          )}
          {criterion.intent === "risk" && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          )}
          {criterion.intent === "exclude" && (
            <X className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
          <span className="font-medium">{criterion.category}</span>
          <span className="text-muted-foreground truncate">
            {criterion.operator === "contains" ? "contains" : "="}{" "}
            {criterion.value}
          </span>
          {criterion.intent === "qualify" && criterion.weight != null && (
            <Badge variant="secondary" className="shrink-0">w:{criterion.weight}</Badge>
          )}
          {criterion.note && (
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <span className="text-xs underline">why?</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
      {showNote && criterion.note && (
        <div className="pb-1 pl-7">
          <p className="text-xs text-muted-foreground italic">{criterion.note}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CriteriaGroupedList({
  criteria,
  icpId,
}: {
  criteria: Criterion[];
  icpId: string;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["__risk", "__exclusions"])
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [isPending, startTransition] = useTransition();

  // Cross-cutting intent views
  const riskCriteria = criteria.filter((c) => c.intent === "risk");
  const excludeCriteria = criteria.filter((c) => c.intent === "exclude");

  // Build visual groups — only groups that have criteria
  const groupedCriteria = VISUAL_GROUPS
    .map((vg) => ({
      ...vg,
      items: criteria.filter(vg.match),
    }))
    .filter((vg) => vg.items.length > 0);

  // Completeness
  const existingCategories = new Set(criteria.map((c) => c.category));
  const definedBasics = KEY_BASICS.filter((c) => existingCategories.has(c));
  const missingBasics = KEY_BASICS.filter((c) => !existingCategories.has(c));

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleAdd() {
    setEditingCriterion(null);
    setDialogOpen(true);
  }

  function handleEdit(criterion: Criterion) {
    setEditingCriterion(criterion);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCriterion(id);
    });
  }

  return (
    <div className="space-y-5">
      {/* Completeness hint — subtle, one line */}
      {criteria.length > 0 && missingBasics.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ICP completeness: {definedBasics.length} of {KEY_BASICS.length} key basics defined
          {missingBasics.length > 0 && (
            <> · Consider adding: {missingBasics.map((c) => KEY_BASICS_LABELS[c]).join(", ")}</>
          )}
        </p>
      )}

      {/* Unified criteria list with light visual group labels */}
      <div className="rounded-lg border">
        {criteria.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No criteria defined yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Start by defining what makes a company your ideal customer — industry, region, size, or business model.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add criterion
            </Button>
          </div>
        ) : (
          <div className="px-4 py-1">
            {groupedCriteria.map((group, gi) => (
              <div key={group.key}>
                {/* Light group label — just a divider, not a section */}
                <div className={`flex items-center gap-2 pt-3 pb-1 ${gi > 0 ? "border-t border-dashed" : ""}`}>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/50">
                    {group.label}
                  </span>
                </div>
                {/* Criteria rows */}
                <div className="divide-y divide-border/50">
                  {group.items.map((c) => (
                    <CriterionRow
                      key={c.id}
                      criterion={c}
                      onEdit={() => handleEdit(c)}
                      onDelete={() => handleDelete(c.id)}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add criterion button */}
      {criteria.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add criterion
          </Button>
        </div>
      )}

      {/* Risk summary */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => toggleSection("__risk")}
            className="flex items-center gap-2 text-left hover:opacity-80"
          >
            {expandedSections.has("__risk") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium">Risk / Needs review</span>
            <Badge variant="outline" className="text-amber-700">
              {riskCriteria.length}
            </Badge>
          </button>
        </div>
        {expandedSections.has("__risk") && (
          <>
            <p className="border-t px-4 pt-2 pb-1 text-xs text-muted-foreground">
              {RISK_DESCRIPTION}
            </p>
            {riskCriteria.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                <p>No risk factors yet. Examples:</p>
                <ul className="mt-1 list-disc list-inside text-xs">
                  {RISK_EMPTY_SUGGESTIONS.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border-t divide-y px-4">
                {riskCriteria.map((c) => (
                  <CriterionRow
                    key={`risk-${c.id}`}
                    criterion={c}
                    onEdit={() => handleEdit(c)}
                    onDelete={() => handleDelete(c.id)}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Exclusions summary */}
      <div className="rounded-lg border border-destructive/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => toggleSection("__exclusions")}
            className="flex items-center gap-2 text-left hover:opacity-80"
          >
            {expandedSections.has("__exclusions") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">Not a fit</span>
            <Badge variant="destructive">{excludeCriteria.length}</Badge>
          </button>
        </div>
        {expandedSections.has("__exclusions") && (
          <>
            <p className="border-t border-destructive/20 px-4 pt-2 pb-1 text-xs text-muted-foreground">
              {EXCLUSIONS_DESCRIPTION}
            </p>
            {excludeCriteria.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                <p>No exclusions yet. Consider adding:</p>
                <ul className="mt-1 list-disc list-inside text-xs">
                  {EXCLUSION_EMPTY_SUGGESTIONS.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border-t border-destructive/20 divide-y divide-destructive/10 px-4">
                {excludeCriteria.map((c) => (
                  <CriterionRow
                    key={`excl-${c.id}`}
                    criterion={c}
                    onEdit={() => handleEdit(c)}
                    onDelete={() => handleDelete(c.id)}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog */}
      <CriterionFormDialog
        icpId={icpId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={
          editingCriterion
            ? {
                id: editingCriterion.id,
                group: editingCriterion.group,
                category: editingCriterion.category,
                operator: editingCriterion.operator,
                value: editingCriterion.value,
                intent: editingCriterion.intent,
                weight: editingCriterion.weight,
                note: editingCriterion.note,
              }
            : undefined
        }
      />
    </div>
  );
}
