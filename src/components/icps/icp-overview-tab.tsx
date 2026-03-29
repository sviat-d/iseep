"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  Users,
  Radio,
  Lightbulb,
  Briefcase,
  Check,
  AlertTriangle,
  ShieldOff,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Criterion = {
  id: string;
  group: string;
  category: string;
  value: string;
  intent: string;
  weight: number | null;
};

type Persona = {
  id: string;
  name: string;
  description: string | null;
  isCustomized?: boolean;
  icpCount?: number;
};

type Signal = {
  id: string;
  type: string;
  label: string;
  strength: number | null;
};

type HypothesisItem = {
  id: string;
  name: string;
  status: string;
};

type CaseItem = {
  id: string;
  companyName: string;
  outcome: string;
  dealValue: string | null;
};

export type IcpOverviewTabProps = {
  icpProducts: Array<{ id: string; name: string }>;
  personas: Persona[];
  signals: Signal[];
  criteria: Criterion[];
  hypotheses: HypothesisItem[];
  cases: CaseItem[];
  icpId: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const signalTypeColor: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  neutral: "bg-muted text-muted-foreground",
};

const hypothesisStatusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  validated: "default",
  testing: "secondary",
  draft: "outline",
  rejected: "destructive",
};

const outcomeVariant: Record<string, "default" | "destructive" | "secondary"> = {
  won: "default",
  lost: "destructive",
  in_progress: "secondary",
};

// ─── Mini Section ───────────────────────────────────────────────────────────

function MiniSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
          <span className="text-[11px] font-normal text-muted-foreground/60">{count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Fit Summary (compact criteria preview) ─────────────────────────────────

function FitSummary({ criteria }: { criteria: Criterion[] }) {
  const ideal = criteria.filter((c) => c.intent === "qualify");
  const review = criteria.filter((c) => c.intent === "risk");
  const exclude = criteria.filter((c) => c.intent === "exclude");

  if (criteria.length === 0) {
    return <p className="text-xs text-muted-foreground">No criteria defined yet.</p>;
  }

  return (
    <div className="space-y-2">
      {ideal.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <Check className="h-3 w-3 text-green-600 shrink-0" />
          {ideal.map((c) => (
            <span key={c.id} className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
              {c.value}
            </span>
          ))}
        </div>
      )}
      {review.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
          {review.map((c) => (
            <span key={c.id} className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              {c.value}
            </span>
          ))}
        </div>
      )}
      {exclude.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <ShieldOff className="h-3 w-3 text-red-500 shrink-0" />
          {exclude.map((c) => (
            <span key={c.id} className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
              {c.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function IcpOverviewTab({
  icpProducts,
  personas,
  signals,
  criteria,
  hypotheses,
  cases,
  icpId,
}: IcpOverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Products */}
      {icpProducts.length > 0 && (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap gap-1">
            {icpProducts.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Fit summary + Personas + Signals */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Fit summary */}
        <MiniSection icon={Check} title="Fit definition" count={criteria.length}>
          <FitSummary criteria={criteria} />
        </MiniSection>

        {/* Personas */}
        <MiniSection icon={Users} title="Personas" count={personas.length}>
          {personas.length === 0 ? (
            <p className="text-xs text-muted-foreground">No personas yet.</p>
          ) : (
            <div className="space-y-1.5">
              {personas.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/personas/${p.id}`} className="text-sm font-medium hover:underline">
                      {p.name}
                    </Link>
                    {p.icpCount && p.icpCount > 1 && (
                      <Badge variant={p.isCustomized ? "outline" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {p.isCustomized ? "Customized" : "Shared"}
                      </Badge>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </MiniSection>

        {/* Signals */}
        <MiniSection icon={Radio} title="Signals" count={signals.length}>
          {signals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No signals yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {signals.map((s) => (
                <span
                  key={s.id}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${signalTypeColor[s.type] ?? "bg-muted text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </MiniSection>
      </div>

      {/* Grid: Hypotheses + Cases counts */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {/* Hypotheses summary */}
        <MiniSection icon={Lightbulb} title="Hypotheses" count={hypotheses.length}>
          {hypotheses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hypotheses yet.</p>
          ) : (
            <div className="space-y-1.5">
              {hypotheses.slice(0, 4).map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  <Badge variant={hypothesisStatusVariant[h.status] ?? "outline"} className="text-[10px] px-1.5 py-0">
                    {h.status}
                  </Badge>
                  <span className="text-xs truncate">{h.name}</span>
                </div>
              ))}
              {hypotheses.length > 4 && (
                <p className="text-xs text-muted-foreground">+{hypotheses.length - 4} more</p>
              )}
            </div>
          )}
        </MiniSection>

        {/* Cases summary */}
        <MiniSection icon={Briefcase} title="Cases" count={cases.length}>
          {cases.length === 0 ? (
            <p className="text-xs text-muted-foreground">No cases yet.</p>
          ) : (
            <div className="space-y-1.5">
              {cases.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Badge variant={outcomeVariant[c.outcome] ?? "secondary"} className="text-[10px] px-1.5 py-0">
                    {c.outcome === "in_progress" ? "In progress" : c.outcome}
                  </Badge>
                  <span className="text-xs truncate">{c.companyName}</span>
                  {c.dealValue && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      ${Number(c.dealValue).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
              {cases.length > 4 && (
                <p className="text-xs text-muted-foreground">+{cases.length - 4} more</p>
              )}
            </div>
          )}
        </MiniSection>
      </div>
    </div>
  );
}
