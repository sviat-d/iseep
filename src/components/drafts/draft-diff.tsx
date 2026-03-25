// src/components/drafts/draft-diff.tsx

import { Badge } from "@/components/ui/badge";

type FieldDiff = {
  field: string;
  current: string;
  proposed: string;
};

export function DraftFieldDiff({ diffs }: { diffs: FieldDiff[] }) {
  if (diffs.length === 0) return null;

  return (
    <div className="space-y-2">
      {diffs.map((d) => (
        <div key={d.field} className="rounded-md border p-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{d.field}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded bg-red-50/50 p-2 dark:bg-red-950/20">
              <p className="mb-0.5 text-[10px] font-medium text-red-600">Current</p>
              <p className="text-xs">{d.current || "—"}</p>
            </div>
            <div className="rounded bg-green-50/50 p-2 dark:bg-green-950/20">
              <p className="mb-0.5 text-[10px] font-medium text-green-600">Proposed</p>
              <p className="text-xs">{d.proposed || "—"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CriteriaPreview({
  criteria,
  variant = "add",
}: {
  criteria: Array<{ group: string; category: string; value: string; intent: string; importance?: number }>;
  variant?: "add" | "remove";
}) {
  const bgClass = variant === "add"
    ? "border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10"
    : "border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10";

  return (
    <div className={`space-y-1 rounded-md border p-3 ${bgClass}`}>
      {criteria.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px]">{c.intent}</Badge>
          <span className="font-medium">{c.category}</span>
          <span className="text-muted-foreground">{c.value}</span>
          {c.importance && <span className="text-muted-foreground">({c.importance}/10)</span>}
        </div>
      ))}
    </div>
  );
}

export function PersonaPreview({
  personas,
  variant = "add",
}: {
  personas: Array<{ name: string; description?: string }>;
  variant?: "add" | "remove";
}) {
  const bgClass = variant === "add"
    ? "border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10"
    : "border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10";

  return (
    <div className={`space-y-1 rounded-md border p-3 ${bgClass}`}>
      {personas.map((p, i) => (
        <div key={i} className="text-xs">
          <span className="font-medium">{p.name}</span>
          {p.description && <span className="text-muted-foreground"> — {p.description}</span>}
        </div>
      ))}
    </div>
  );
}
