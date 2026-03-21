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
  StickyNote,
} from "lucide-react";

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
    new Set(GROUPS)
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(
    null
  );
  const [addGroup, setAddGroup] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const qualifyCriteria = criteria.filter((c) => c.intent === "qualify");
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
                <span className="font-medium capitalize">{group}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t">
                {items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No criteria in this group.
                  </p>
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

      {/* Exclusions section */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-destructive">Exclusions</span>
            <Badge variant="destructive">{excludeCriteria.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleAdd()}>
            <Plus className="mr-1 h-3 w-3" />
            Add Exclusion
          </Button>
        </div>
        {excludeCriteria.length > 0 && (
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
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{criterion.category}</span>
        {criterion.operator && (
          <Badge variant="outline">{criterion.operator}</Badge>
        )}
        <span className="text-muted-foreground">{criterion.value}</span>
        {criterion.intent === "qualify" && criterion.weight != null && (
          <Badge variant="secondary">w:{criterion.weight}</Badge>
        )}
        {criterion.note && (
          <StickyNote className="h-3 w-3 text-muted-foreground" />
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
  );
}
