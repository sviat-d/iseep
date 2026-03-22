import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  GROUP_LABELS,
  GROUP_DESCRIPTIONS,
} from "@/lib/constants";
import {
  Check,
  AlertTriangle,
  ShieldAlert,
  Users,
  Layers,
  BarChart3,
} from "lucide-react";

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

type Persona = {
  id: string;
  name: string;
  description: string | null;
};

type Segment = {
  id: string;
  name: string;
  status: string;
  priorityScore: number;
};

type DealStats = {
  total: number;
  won: number;
  lost: number;
  open: number;
};

type SharedIcp = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  criteria: Criterion[];
  personas: Persona[];
  segments: Segment[];
  dealStats: DealStats;
  showStats: boolean;
};

const GROUPS = [
  "firmographic",
  "technographic",
  "behavioral",
  "compliance",
  "keyword",
] as const;

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

function IntentIcon({ intent }: { intent: string }) {
  switch (intent) {
    case "qualify":
      return <Check className="h-3.5 w-3.5 text-green-600" />;
    case "risk":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    case "exclude":
      return <ShieldAlert className="h-3.5 w-3.5 text-red-500" />;
    default:
      return null;
  }
}

export function SharedIcpView({ icp }: { icp: SharedIcp }) {
  const qualifyCriteria = icp.criteria.filter((c) => c.intent !== "exclude");
  const excludeCriteria = icp.criteria.filter((c) => c.intent === "exclude");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{icp.name}</h1>
          <Badge variant={statusVariant[icp.status] ?? "outline"}>
            {icp.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Version {icp.version}
          </span>
        </div>
        {icp.description && (
          <p className="text-muted-foreground max-w-2xl">{icp.description}</p>
        )}
      </div>

      {/* Criteria Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Criteria</h2>

        {GROUPS.map((group) => {
          const groupCriteria = qualifyCriteria.filter(
            (c) => c.group === group
          );
          if (groupCriteria.length === 0) return null;

          return (
            <Card key={group}>
              <CardHeader>
                <CardTitle>{GROUP_LABELS[group] ?? group}</CardTitle>
                <CardDescription>
                  {GROUP_DESCRIPTIONS[group] ?? ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groupCriteria.map((criterion) => (
                    <div
                      key={criterion.id}
                      className="flex items-start gap-2 rounded-md border px-3 py-2"
                    >
                      <IntentIcon intent={criterion.intent} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">
                          {criterion.category}
                        </span>
                        {criterion.operator && (
                          <span className="mx-1 text-xs text-muted-foreground">
                            {criterion.operator}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {criterion.value}
                        </span>
                      </div>
                      {criterion.weight != null && (
                        <Badge variant="outline" className="ml-auto shrink-0">
                          {criterion.weight}/10
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Exclusions */}
        {excludeCriteria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Exclusions
              </CardTitle>
              <CardDescription>
                Hard disqualifiers. If any of these match, the company is not a
                fit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {excludeCriteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50/50 px-3 py-2 dark:border-red-900/30 dark:bg-red-950/20"
                  >
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        {criterion.category}
                      </span>
                      {criterion.operator && (
                        <span className="mx-1 text-xs text-muted-foreground">
                          {criterion.operator}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {criterion.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {icp.criteria.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No criteria defined yet.
          </p>
        )}
      </section>

      {/* Personas Section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Users className="h-5 w-5" />
          Personas
        </h2>

        {icp.personas.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No personas defined yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {icp.personas.map((persona) => (
              <Card key={persona.id} size="sm">
                <CardHeader>
                  <CardTitle>{persona.name}</CardTitle>
                </CardHeader>
                {persona.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {persona.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Segments Section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Layers className="h-5 w-5" />
          Segments
        </h2>

        {icp.segments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No segments defined yet.
          </p>
        ) : (
          <div className="space-y-2">
            {icp.segments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{segment.name}</span>
                  <Badge
                    variant={statusVariant[segment.status] ?? "outline"}
                  >
                    {segment.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  Priority: {segment.priorityScore}/10
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Performance Section (only if showStats) */}
      {icp.showStats && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5" />
            Performance
          </h2>

          {icp.dealStats.total === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No deal data available yet.
            </p>
          ) : (
            <PerformanceStats dealStats={icp.dealStats} />
          )}
        </section>
      )}
    </div>
  );
}

function PerformanceStats({ dealStats }: { dealStats: DealStats }) {
  const winRate =
    dealStats.won + dealStats.lost > 0
      ? ((dealStats.won / (dealStats.won + dealStats.lost)) * 100).toFixed(1)
      : "N/A";

  const isMuted = dealStats.total < 5;

  return (
    <div className={isMuted ? "opacity-60" : ""}>
      {isMuted && (
        <p className="mb-4 text-sm text-muted-foreground">
          Limited data (fewer than 5 deals). Metrics may not be reliable.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open Deals" value={dealStats.open} />
        <StatCard label="Won Deals" value={dealStats.won} />
        <StatCard label="Lost Deals" value={dealStats.lost} />
        <StatCard
          label="Win Rate"
          value={typeof winRate === "string" ? winRate : `${winRate}%`}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
