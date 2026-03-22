"use client";

import type { ConditionNode, GroupNode, CriterionNode } from "@/lib/segment-helpers";

type SegmentReadViewProps = {
  logicJson: ConditionNode;
};

const INTENT_ICON: Record<string, string> = {
  qualify: "✅",
  risk: "⚠️",
  exclude: "❌",
};

function renderCriterion(node: CriterionNode) {
  const icon = INTENT_ICON[node.intent] ?? "✅";
  const op = node.operator === "contains" ? "contains" : "=";
  return (
    <span>
      {icon} {node.category} {op} {node.value}
    </span>
  );
}

function RenderGroup({
  node,
  depth,
}: {
  node: GroupNode;
  depth: number;
}) {
  if (node.conditions.length === 0) {
    return depth === 0 ? (
      <p className="text-sm text-muted-foreground">
        No conditions defined yet.
      </p>
    ) : null;
  }

  if (node.operator === "NOT") {
    return (
      <div className="pl-4">
        <span className="text-sm font-medium text-muted-foreground">
          NOT (
        </span>
        {node.conditions.map((child, i) => (
          <RenderNode key={i} node={child} depth={depth + 1} />
        ))}
        <span className="text-sm font-medium text-muted-foreground">)</span>
      </div>
    );
  }

  return (
    <div className={depth > 0 ? "pl-4" : undefined}>
      {node.conditions.map((child, i) => (
        <div key={i}>
          {i > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">
              {node.operator}{" "}
            </span>
          )}
          <RenderNode node={child} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function RenderNode({
  node,
  depth,
}: {
  node: ConditionNode;
  depth: number;
}) {
  if (node.type === "criterion") {
    return (
      <div className="text-sm py-0.5">
        {renderCriterion(node)}
      </div>
    );
  }
  return <RenderGroup node={node} depth={depth} />;
}

export function SegmentReadView({ logicJson }: SegmentReadViewProps) {
  const node = logicJson as ConditionNode;

  if (
    !node ||
    (node.type === "group" && node.conditions.length === 0)
  ) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No conditions defined yet.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      <RenderNode node={node} depth={0} />
    </div>
  );
}
