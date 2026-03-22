"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CriterionFormDialog } from "@/components/criteria/criterion-form-dialog";
import type { CriterionNode } from "@/lib/segment-helpers";
import { Plus } from "lucide-react";

type Criterion = {
  id: string;
  group: string;
  category: string;
  operator: string | null;
  value: string;
  intent: string;
  weight: number | null;
  note: string | null;
};

type ConditionPickerDialogProps = {
  icpCriteria: Criterion[];
  icpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (node: CriterionNode) => void;
};

const INTENT_ICON: Record<string, string> = {
  qualify: "✅",
  risk: "⚠️",
  exclude: "❌",
};

const INTENT_LABELS: Record<string, string> = {
  qualify: "Good fit",
  risk: "Risk / Needs review",
  exclude: "Not a fit",
};

const INTENT_ORDER = ["qualify", "risk", "exclude"] as const;

function criterionToNode(c: Criterion): CriterionNode {
  return {
    type: "criterion",
    criterionId: c.id,
    group: c.group,
    category: c.category,
    operator: c.operator ?? "equals",
    value: c.value,
    intent: c.intent,
  };
}

export function ConditionPickerDialog({
  icpCriteria,
  icpId,
  open,
  onOpenChange,
  onSelect,
}: ConditionPickerDialogProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  // Group criteria by intent
  const grouped = new Map<string, Criterion[]>();
  for (const c of icpCriteria) {
    const existing = grouped.get(c.intent);
    if (existing) {
      existing.push(c);
    } else {
      grouped.set(c.intent, [c]);
    }
  }

  function handleSelect(criterion: Criterion) {
    onSelect(criterionToNode(criterion));
    onOpenChange(false);
  }

  function handleCreateClose(isOpen: boolean) {
    setCreateOpen(isOpen);
    if (!isOpen) {
      // Refresh to get newly created criteria
      router.refresh();
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Condition</DialogTitle>
            <DialogDescription>
              Pick an existing rule from this ICP, or create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-4">
            {INTENT_ORDER.map((intent) => {
              const items = grouped.get(intent);
              if (!items || items.length === 0) return null;
              return (
                <div key={intent} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {INTENT_ICON[intent]} {INTENT_LABELS[intent]}
                  </p>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelect(c)}
                    >
                      <span>
                        {INTENT_ICON[c.intent]} {c.category} ={" "}
                        {c.value}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

            {icpCriteria.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No rules defined for this ICP yet. Create one below.
              </p>
            )}
          </div>

          <div className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create new rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CriterionFormDialog
        icpId={icpId}
        open={createOpen}
        onOpenChange={handleCreateClose}
      />
    </>
  );
}
