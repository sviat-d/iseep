"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentRuleDialog } from "@/components/segments/segment-rule-dialog";
import { updateSegment } from "@/actions/segments";
import {
  addRule,
  removeRule,
  updateRule,
  type SegmentLogic,
  type SegmentRule,
} from "@/lib/segment-helpers";
import { PROPERTY_OPTIONS } from "@/lib/constants";
import { Save, X, Plus, Pencil, Trash2, StickyNote } from "lucide-react";

type SegmentBuilderProps = {
  segmentId: string;
  initialLogic: SegmentLogic;
  onCancel: () => void;
};

const INTENT_ICON: Record<string, string> = {
  qualify: "\u2705",
  risk: "\u26A0\uFE0F",
  exclude: "\u274C",
};

const SECTIONS: Array<{
  intent: "qualify" | "risk" | "exclude";
  title: string;
  subtitle: string;
}> = [
  {
    intent: "qualify",
    title: "Include (must match)",
    subtitle: "Rules that define this segment",
  },
  {
    intent: "exclude",
    title: "Exclude (must not match)",
    subtitle: "Hard disqualifiers for this segment",
  },
  {
    intent: "risk",
    title: "Risk (needs review)",
    subtitle: "Borderline cases requiring manual review",
  },
];

function propertyLabel(property: string): string {
  const opt = PROPERTY_OPTIONS.find((p) => p.category === property);
  return opt?.label ?? property;
}

export function SegmentBuilder({
  segmentId,
  initialLogic,
  onCancel,
}: SegmentBuilderProps) {
  const [logic, setLogic] = useState<SegmentLogic>(initialLogic);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIntent, setDialogIntent] = useState<
    "qualify" | "risk" | "exclude"
  >("qualify");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  function handleAddRule(intent: "qualify" | "risk" | "exclude") {
    setDialogIntent(intent);
    setEditIndex(null);
    setDialogOpen(true);
  }

  function handleEditRule(index: number) {
    const rule = logic.rules[index];
    setDialogIntent(rule.intent);
    setEditIndex(index);
    setDialogOpen(true);
  }

  function handleRemoveRule(index: number) {
    setLogic((prev) => removeRule(prev, index));
  }

  function handleDialogSubmit(rule: SegmentRule) {
    if (editIndex !== null) {
      setLogic((prev) => updateRule(prev, editIndex, rule));
    } else {
      setLogic((prev) => addRule(prev, rule));
    }
    setEditIndex(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("logicJson", JSON.stringify(logic));
      const result = await updateSegment(segmentId, formData);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  function handleCancel() {
    setLogic(initialLogic);
    onCancel();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {SECTIONS.map(({ intent, title, subtitle }) => {
        const sectionRules = logic.rules
          .map((rule, index) => ({ rule, index }))
          .filter(({ rule }) => rule.intent === intent);

        return (
          <div key={intent} className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>

            {sectionRules.length > 0 ? (
              <div className="space-y-2">
                {sectionRules.map(({ rule, index }) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">
                        {INTENT_ICON[rule.intent]}
                      </span>
                      <span className="font-medium">
                        {propertyLabel(rule.property)}
                      </span>
                      <span className="text-muted-foreground">=</span>
                      <span className="truncate">{rule.value}</span>
                      {rule.importance != null && (
                        <Badge variant="secondary" className="shrink-0">
                          {rule.importance}/10
                        </Badge>
                      )}
                      {rule.note && (
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleEditRule(index)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveRule(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No rules in this section yet.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddRule(intent)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add rule
            </Button>
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Saving..." : "Save rules"}
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>

      <SegmentRuleDialog
        intent={dialogIntent}
        defaultValues={editIndex !== null ? logic.rules[editIndex] : undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}
