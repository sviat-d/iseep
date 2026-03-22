"use client";

import { PROPERTY_OPTIONS } from "@/lib/constants";
import type { SegmentLogic, SegmentRule } from "@/lib/segment-helpers";

type SegmentReadViewProps = {
  logic: SegmentLogic;
};

const INTENT_ICON: Record<string, string> = {
  qualify: "\u2705",
  risk: "\u26A0\uFE0F",
  exclude: "\u274C",
};

const SECTIONS: Array<{
  intent: "qualify" | "risk" | "exclude";
  title: string;
}> = [
  { intent: "qualify", title: "Include (must match)" },
  { intent: "exclude", title: "Exclude (must not match)" },
  { intent: "risk", title: "Risk (needs review)" },
];

function propertyLabel(property: string): string {
  const opt = PROPERTY_OPTIONS.find((p) => p.category === property);
  return opt?.label ?? property;
}

function RuleRow({ rule }: { rule: SegmentRule }) {
  const icon = INTENT_ICON[rule.intent] ?? "\u2705";
  return (
    <div className="text-sm py-0.5">
      <span>
        {icon} {propertyLabel(rule.property)} = {rule.value}
      </span>
      {rule.importance != null && (
        <span className="ml-2 text-muted-foreground">({rule.importance}/10)</span>
      )}
    </div>
  );
}

export function SegmentReadView({ logic }: SegmentReadViewProps) {
  if (logic.rules.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No rules defined yet. Click Edit to start refining this segment.
      </p>
    );
  }

  const hasAnySection = SECTIONS.some(({ intent }) =>
    logic.rules.some((r) => r.intent === intent)
  );

  if (!hasAnySection) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No rules defined yet. Click Edit to start refining this segment.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      {SECTIONS.map(({ intent, title }) => {
        const rules = logic.rules.filter((r) => r.intent === intent);
        if (rules.length === 0) return null;
        return (
          <div key={intent}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {title}
            </p>
            {rules.map((rule, i) => (
              <RuleRow key={i} rule={rule} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
