export type SegmentRule = {
  criterionId?: string;
  property: string;
  value: string;
  intent: "qualify" | "risk" | "exclude";
  importance?: number;
  note?: string;
};

export type SegmentLogic = {
  rules: SegmentRule[];
};

export function emptyLogic(): SegmentLogic {
  return { rules: [] };
}

export function addRule(logic: SegmentLogic, rule: SegmentRule): SegmentLogic {
  return { rules: [...logic.rules, rule] };
}

export function removeRule(logic: SegmentLogic, index: number): SegmentLogic {
  return { rules: logic.rules.filter((_, i) => i !== index) };
}

export function updateRule(
  logic: SegmentLogic,
  index: number,
  rule: SegmentRule
): SegmentLogic {
  return { rules: logic.rules.map((r, i) => (i === index ? rule : r)) };
}

export function countRules(logic: SegmentLogic): number {
  return logic.rules.length;
}

/** Parse old tree format or new flat format. */
export function parseLogicJson(json: unknown): SegmentLogic {
  if (!json || typeof json !== "object") return emptyLogic();
  if ("rules" in (json as Record<string, unknown>)) return json as SegmentLogic;
  // Legacy tree format — extract leaf criteria as flat rules
  const rules: SegmentRule[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "criterion") {
      rules.push({
        criterionId: n.criterionId as string | undefined,
        property: (n.category as string) ?? "",
        value: (n.value as string) ?? "",
        intent:
          (n.intent as string) === "exclude"
            ? "exclude"
            : (n.intent as string) === "risk"
              ? "risk"
              : "qualify",
        importance: typeof n.weight === "number" ? n.weight : undefined,
        note: typeof n.note === "string" ? n.note : undefined,
      });
    } else if (n.type === "group" && Array.isArray(n.conditions)) {
      (n.conditions as unknown[]).forEach(walk);
    }
  }
  walk(json);
  return { rules };
}
