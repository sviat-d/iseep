"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { CriterionNode } from "@/lib/segment-helpers";

type ConditionRowProps = {
  node: CriterionNode;
  path: number[];
  onEdit: (path: number[]) => void;
  onRemove: (path: number[]) => void;
};

const INTENT_ICON: Record<string, string> = {
  qualify: "✅",
  risk: "⚠️",
  exclude: "❌",
};

export function ConditionRow({
  node,
  path,
  onEdit,
  onRemove,
}: ConditionRowProps) {
  const icon = INTENT_ICON[node.intent] ?? "✅";
  const op = node.operator === "contains" ? "contains" : "=";

  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm">
      <span>
        {icon} {node.category} {op} {node.value}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(path)}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onRemove(path)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
