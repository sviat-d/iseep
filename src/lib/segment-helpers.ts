export type CriterionNode = {
  type: "criterion";
  criterionId: string;
  group: string;
  category: string;
  operator: string;
  value: string;
  intent: string;
};

export type GroupNode = {
  type: "group";
  operator: "AND" | "OR" | "NOT";
  conditions: ConditionNode[];
};

export type ConditionNode = CriterionNode | GroupNode;

export function emptyTree(): GroupNode {
  return { type: "group", operator: "AND", conditions: [] };
}

export function addCondition(
  tree: GroupNode,
  path: number[],
  node: ConditionNode
): GroupNode {
  if (path.length === 0) {
    return { ...tree, conditions: [...tree.conditions, node] };
  }
  const [head, ...rest] = path;
  const conditions = tree.conditions.map((c, i) => {
    if (i !== head || c.type !== "group") return c;
    return addCondition(c, rest, node);
  });
  return { ...tree, conditions };
}

export function removeCondition(
  tree: GroupNode,
  path: number[]
): GroupNode {
  if (path.length === 1) {
    return {
      ...tree,
      conditions: tree.conditions.filter((_, i) => i !== path[0]),
    };
  }
  const [head, ...rest] = path;
  const conditions = tree.conditions.map((c, i) => {
    if (i !== head || c.type !== "group") return c;
    return removeCondition(c, rest);
  });
  return { ...tree, conditions };
}

export function updateCondition(
  tree: GroupNode,
  path: number[],
  node: ConditionNode
): GroupNode {
  if (path.length === 1) {
    const conditions = tree.conditions.map((c, i) =>
      i === path[0] ? node : c
    );
    return { ...tree, conditions };
  }
  const [head, ...rest] = path;
  const conditions = tree.conditions.map((c, i) => {
    if (i !== head || c.type !== "group") return c;
    return updateCondition(c, rest, node);
  });
  return { ...tree, conditions };
}

export function addGroup(
  tree: GroupNode,
  path: number[],
  operator: "AND" | "OR" | "NOT"
): GroupNode {
  const newGroup: GroupNode = { type: "group", operator, conditions: [] };
  return addCondition(tree, path, newGroup);
}

export function toggleGroupOperator(
  tree: GroupNode,
  path: number[]
): GroupNode {
  if (path.length === 0) {
    const next = tree.operator === "AND" ? "OR" : "AND";
    return { ...tree, operator: next };
  }
  const [head, ...rest] = path;
  const conditions = tree.conditions.map((c, i) => {
    if (i !== head || c.type !== "group") return c;
    return toggleGroupOperator(c, rest);
  });
  return { ...tree, conditions };
}

export function countConditions(node: ConditionNode): number {
  if (node.type === "criterion") return 1;
  return node.conditions.reduce((sum, c) => sum + countConditions(c), 0);
}
