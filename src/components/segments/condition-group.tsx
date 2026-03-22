"use client";

import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { ConditionRow } from "@/components/segments/condition-row";
import type { ConditionNode, GroupNode } from "@/lib/segment-helpers";

type ConditionGroupProps = {
  node: GroupNode;
  path: number[];
  onUpdate: (path: number[], node: ConditionNode) => void;
  onRemove: (path: number[]) => void;
  onAdd: (path: number[]) => void;
  onAddGroup: (path: number[], operator: "AND" | "OR" | "NOT") => void;
  onToggleOperator: (path: number[]) => void;
  onEditCriterion: (path: number[]) => void;
};

export function ConditionGroup({
  node,
  path,
  onUpdate,
  onRemove,
  onAdd,
  onAddGroup,
  onToggleOperator,
  onEditCriterion,
}: ConditionGroupProps) {
  const isRoot = path.length === 0;
  const isNot = node.operator === "NOT";
  const hasChild = node.conditions.length > 0;

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isRoot ? "border-border" : "border-dashed border-muted-foreground/30"
      }`}
    >
      {/* Header: operator label + remove button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isNot ? (
            <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
              NOT
            </span>
          ) : (
            <button
              type="button"
              className="rounded bg-muted px-2 py-0.5 text-xs font-semibold hover:bg-muted/80 transition-colors"
              onClick={() => onToggleOperator(path)}
              title="Click to toggle between AND / OR"
            >
              {node.operator}
            </button>
          )}
        </div>
        {!isRoot && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(path)}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {/* Children */}
      <div className="space-y-2">
        {node.conditions.map((child, i) => {
          const childPath = [...path, i];
          if (child.type === "criterion") {
            return (
              <ConditionRow
                key={i}
                node={child}
                path={childPath}
                onEdit={onEditCriterion}
                onRemove={onRemove}
              />
            );
          }
          return (
            <ConditionGroup
              key={i}
              node={child}
              path={childPath}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAdd={onAdd}
              onAddGroup={onAddGroup}
              onToggleOperator={onToggleOperator}
              onEditCriterion={onEditCriterion}
            />
          );
        })}
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap gap-1 pt-1">
        {/* For NOT groups: only allow 1 child */}
        {!(isNot && hasChild) && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onAdd(path)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Condition
          </Button>
        )}
        {!isNot && (
          <>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onAddGroup(path, "AND")}
            >
              <Plus className="mr-1 h-3 w-3" />
              AND group
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onAddGroup(path, "OR")}
            >
              <Plus className="mr-1 h-3 w-3" />
              OR group
            </Button>
          </>
        )}
        {!(isNot && hasChild) && !isNot && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onAddGroup(path, "NOT")}
          >
            <Plus className="mr-1 h-3 w-3" />
            NOT
          </Button>
        )}
      </div>
    </div>
  );
}
