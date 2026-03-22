"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConditionGroup } from "@/components/segments/condition-group";
import { ConditionPickerDialog } from "@/components/segments/condition-picker-dialog";
import { updateSegment } from "@/actions/segments";
import {
  addCondition,
  removeCondition,
  updateCondition,
  addGroup,
  toggleGroupOperator,
  type ConditionNode,
  type GroupNode,
  type CriterionNode,
} from "@/lib/segment-helpers";
import { Save, X } from "lucide-react";

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

type SegmentBuilderProps = {
  segmentId: string;
  initialLogicJson: ConditionNode;
  icpCriteria: Criterion[];
  icpId: string;
  onCancel: () => void;
};

export function SegmentBuilder({
  segmentId,
  initialLogicJson,
  icpCriteria,
  icpId,
  onCancel,
}: SegmentBuilderProps) {
  const [logicJson, setLogicJson] = useState<GroupNode>(
    initialLogicJson as GroupNode
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPath, setPickerPath] = useState<number[]>([]);
  const [editPath, setEditPath] = useState<number[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpdate(path: number[], node: ConditionNode) {
    setLogicJson((prev) => updateCondition(prev, path, node));
  }

  function handleRemove(path: number[]) {
    setLogicJson((prev) => removeCondition(prev, path));
  }

  function handleAdd(path: number[]) {
    setPickerPath(path);
    setEditPath(null);
    setPickerOpen(true);
  }

  function handleAddGroup(
    path: number[],
    operator: "AND" | "OR" | "NOT"
  ) {
    setLogicJson((prev) => addGroup(prev, path, operator));
  }

  function handleToggleOperator(path: number[]) {
    setLogicJson((prev) => toggleGroupOperator(prev, path));
  }

  function handlePickerSelect(node: CriterionNode) {
    if (editPath) {
      // Replacing existing criterion
      setLogicJson((prev) => updateCondition(prev, editPath, node));
      setEditPath(null);
    } else {
      setLogicJson((prev) => addCondition(prev, pickerPath, node));
    }
  }

  function handleEditCriterion(path: number[]) {
    setEditPath(path);
    setPickerPath(path.slice(0, -1));
    setPickerOpen(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("logicJson", JSON.stringify(logicJson));
      const result = await updateSegment(segmentId, formData);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  function handleCancel() {
    setLogicJson(initialLogicJson as GroupNode);
    onCancel();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ConditionGroup
        node={logicJson}
        path={[]}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
        onAdd={handleAdd}
        onAddGroup={handleAddGroup}
        onToggleOperator={handleToggleOperator}
        onEditCriterion={handleEditCriterion}
      />

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Saving..." : "Save conditions"}
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>

      <ConditionPickerDialog
        icpCriteria={icpCriteria}
        icpId={icpId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
