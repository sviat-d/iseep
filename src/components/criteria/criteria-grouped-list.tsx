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
  CORE_CRITERIA_CATEGORIES,
  ADDITIONAL_GROUPS,
  ADVANCED_GROUPS,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCoreCriterion(c: Criterion) {
  return c.group === "firmographic";
}

function isAdditionalCriterion(c: Criterion) {
  return ADDITIONAL_GROUPS.includes(c.group);
}

function isAdvancedCriterion(c: Criterion) {
  return ADVANCED_GROUPS.includes(c.group);
}

const CORE_LABELS: Record<string, string> = {
  industry: "Industry",
  region: "Region",
  company_size: "Company size",
  business_model: "Business model",
};

// ─── ICP Strength Bar ─────────────────────────────────────────────────────────

function IcpStrengthBar({ criteria }: { criteria: Criterion[] }) {
  const existingCategories = new Set(criteria.map((c) => c.category));
  const defined = CORE_CRITERIA_CATEGORIES.filter((c) => existingCategories.has(c));
  const missing = CORE_CRITERIA_CATEGORIES.filter((c) => !existingCategories.has(c));
  const total = CORE_CRITERIA_CATEGORIES.length;
  const pct = Math.round((defined.length / total) * 100);

  if (defined.length === total) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            All core criteria defined
          </span>
          <span className="text-xs text-green-600 dark:text-green-400">
            {total}/{total}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
          ICP Strength
        </span>
        <span className="text-xs text-amber-700 dark:text-amber-400">
          {defined.length} of {total} core criteria
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-amber-200/50 dark:bg-amber-800/30">
        <div
          className="h-1.5 rounded-full bg-amber-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Consider adding: {missing.map((c) => CORE_LABELS[c] ?? c).join(", ")}
        </p>
      )}
    </div>
  );
}

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
      <div className="flex items-center justify-between px-4 py-2.5">
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
        <div className="px-4 pb-2 pl-11">
          <p className="text-xs text-muted-foreground italic">{criterion.note}</p>
        </div>
      )}
    </div>
  );
}

// ─── Core Criteria Section ────────────────────────────────────────────────────

function CoreSection({
  criteria,
  onAdd,
  onEdit,
  onDelete,
  isPending,
}: {
  criteria: Criterion[];
  onAdd: () => void;
  onEdit: (c: Criterion) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border-2 border-foreground/10">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="font-semibold">Core criteria</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define who your ideal customer is
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Add criterion
        </Button>
      </div>
      <div className="border-t">
        {criteria.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Start by defining the basics of your ideal customer
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Most teams begin with Industry and Region, then add Company size and Business model to sharpen the profile.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {criteria.map((c) => (
              <CriterionRow
                key={c.id}
                criterion={c}
                onEdit={() => onEdit(c)}
                onDelete={() => onDelete(c.id)}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  description,
  emptyTitle,
  emptyDescription,
  criteria,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  isPending,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  criteria: Criterion[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: (c: Criterion) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{title}</span>
          {criteria.length > 0 && (
            <Badge variant="secondary">{criteria.length}</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{description}</span>
      </button>
      {isOpen && (
        <div className="border-t">
          {criteria.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">{emptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{emptyDescription}</p>
            </div>
          ) : (
            <div className="divide-y">
              {criteria.map((c) => (
                <CriterionRow
                  key={c.id}
                  criterion={c}
                  onEdit={() => onEdit(c)}
                  onDelete={() => onDelete(c.id)}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
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
    new Set(["additional", "advanced", "__risk", "__exclusions"])
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [isPending, startTransition] = useTransition();

  // Tier-based grouping
  const coreCriteria = criteria.filter(isCoreCriterion);
  const additionalCriteria = criteria.filter(isAdditionalCriterion);
  const advancedCriteria = criteria.filter(isAdvancedCriterion);
  const riskCriteria = criteria.filter((c) => c.intent === "risk");
  const excludeCriteria = criteria.filter((c) => c.intent === "exclude");

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
    <div className="space-y-4">
      {/* ICP Strength */}
      <IcpStrengthBar criteria={criteria} />

      {/* Core Criteria — always open, visually dominant */}
      <CoreSection
        criteria={coreCriteria}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isPending={isPending}
      />

      {/* Additional Criteria — collapsible */}
      <CollapsibleSection
        title="Additional criteria"
        description="Other ways to describe your ICP"
        emptyTitle="No additional criteria yet"
        emptyDescription="Add platform, tech stack, growth stage, keywords, or other signals that help identify your ideal customer beyond the basics."
        criteria={additionalCriteria}
        isOpen={expandedSections.has("additional")}
        onToggle={() => toggleSection("additional")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isPending={isPending}
      />

      {/* Advanced Criteria — collapsible */}
      <CollapsibleSection
        title="Advanced criteria"
        description="Compliance & regulation"
        emptyTitle="No compliance criteria yet"
        emptyDescription="Add regulatory status, license type, or jurisdiction requirements if your product operates in regulated industries."
        criteria={advancedCriteria}
        isOpen={expandedSections.has("advanced")}
        onToggle={() => toggleSection("advanced")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isPending={isPending}
      />

      {/* Global add button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add criterion
        </Button>
      </div>

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
              <div className="border-t divide-y">
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
              <div className="border-t border-destructive/20 divide-y divide-destructive/10">
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

      {/* Dialog — no defaultGroup, picker always shows for new criteria */}
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
