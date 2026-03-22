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
  GROUP_LABELS,
  GROUP_DESCRIPTIONS,
  GROUP_EMPTY_SUGGESTIONS,
  EXCLUSIONS_DESCRIPTION,
  EXCLUSION_EMPTY_SUGGESTIONS,
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

const GROUPS = [
  "firmographic",
  "technographic",
  "behavioral",
  "compliance",
  "keyword",
] as const;

export function CriteriaGroupedList({
  criteria,
  icpId,
}: {
  criteria: Criterion[];
  icpId: string;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set([...GROUPS, "__risk", "__exclusions"])
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(
    null
  );
  const [addGroup, setAddGroup] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const qualifyCriteria = criteria.filter((c) => c.intent === "qualify");
  const riskCriteria = criteria.filter((c) => c.intent === "risk");
  const excludeCriteria = criteria.filter((c) => c.intent === "exclude");

  const grouped = GROUPS.reduce(
    (acc, group) => {
      acc[group] = qualifyCriteria.filter((c) => c.group === group);
      return acc;
    },
    {} as Record<string, Criterion[]>
  );

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function handleAdd(group?: string) {
    setEditingCriterion(null);
    setAddGroup(group);
    setDialogOpen(true);
  }

  function handleEdit(criterion: Criterion) {
    setEditingCriterion(criterion);
    setAddGroup(undefined);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCriterion(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Qualify criteria grouped by type */}
      {GROUPS.map((group) => {
        const items = grouped[group];
        const isExpanded = expandedGroups.has(group);

        return (
          <div key={group} className="rounded-lg border">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">{GROUP_LABELS[group] ?? group}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t">
                <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground">
                  {GROUP_DESCRIPTIONS[group]}
                </p>
                {items.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    <p>No criteria yet. Start by adding:</p>
                    <ul className="mt-1 list-disc list-inside">
                      {(GROUP_EMPTY_SUGGESTIONS[group] ?? []).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="divide-y">
                    {items.map((criterion) => (
                      <CriterionRow
                        key={criterion.id}
                        criterion={criterion}
                        onEdit={() => handleEdit(criterion)}
                        onDelete={() => handleDelete(criterion.id)}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                )}
                <div className="border-t px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAdd(group)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Risk section */}
      <div
        className={`rounded-lg border border-amber-300/50 ${riskCriteria.length === 0 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
      >
        <button
          type="button"
          onClick={() => toggleGroup("__risk")}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {expandedGroups.has("__risk") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-500">Risk / Needs review</span>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {riskCriteria.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAdd(); }}>
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </button>
        {expandedGroups.has("__risk") && (
          <>
            <p className="border-t border-amber-200/50 px-4 pt-2 pb-1 text-xs text-muted-foreground">
              Borderline factors that need case-by-case evaluation. Not a hard exclusion, but requires attention.
            </p>
            {riskCriteria.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                <p>No risk factors yet. Examples:</p>
                <ul className="mt-1 list-disc list-inside">
                  <li>Region with licensing restrictions</li>
                  <li>Industry with regulatory uncertainty</li>
                  <li>Company size at the edge of your capacity</li>
                </ul>
              </div>
            ) : (
              <div className="border-t border-amber-200/50 divide-y divide-amber-200/30">
                {riskCriteria.map((criterion) => (
                  <CriterionRow
                    key={criterion.id}
                    criterion={criterion}
                    onEdit={() => handleEdit(criterion)}
                    onDelete={() => handleDelete(criterion.id)}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Exclusions section */}
      <div
        className={`rounded-lg border border-destructive/30 ${excludeCriteria.length === 0 ? "bg-destructive/5" : ""}`}
      >
        <button
          type="button"
          onClick={() => toggleGroup("__exclusions")}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {expandedGroups.has("__exclusions") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">Not a fit</span>
            <Badge variant="destructive">{excludeCriteria.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAdd(); }}>
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </button>
        {expandedGroups.has("__exclusions") && (
          <>
            <p className="border-t border-destructive/20 px-4 pt-2 pb-1 text-xs text-muted-foreground">
              {EXCLUSIONS_DESCRIPTION}
            </p>
            {excludeCriteria.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                <p>No exclusions yet. Consider adding:</p>
                <ul className="mt-1 list-disc list-inside">
                  {EXCLUSION_EMPTY_SUGGESTIONS.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border-t border-destructive/20 divide-y divide-destructive/10">
                {excludeCriteria.map((criterion) => (
                  <CriterionRow
                    key={criterion.id}
                    criterion={criterion}
                    onEdit={() => handleEdit(criterion)}
                    onDelete={() => handleDelete(criterion.id)}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

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
        defaultGroup={addGroup}
      />
    </div>
  );
}

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
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 text-sm">
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
          {criterion.operator && (
            <Badge variant="outline">{criterion.operator}</Badge>
          )}
          <span className="text-muted-foreground">{criterion.value}</span>
          {criterion.intent !== "exclude" && criterion.weight != null && (
            <Badge variant="secondary">w:{criterion.weight}</Badge>
          )}
          {criterion.note && (
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className="text-muted-foreground hover:text-foreground"
              title="Show note"
            >
              <span className="text-xs underline">why?</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
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
