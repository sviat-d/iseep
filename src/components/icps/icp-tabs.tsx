"use client";

import Link from "next/link";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CriteriaGroupedList } from "@/components/criteria/criteria-grouped-list";
import { PersonaList } from "@/components/personas/persona-list";
import { SignalList } from "@/components/signals/signal-list";
import { IcpVersionHistory } from "@/components/icps/icp-version-history";

type Criterion = {
  id: string;
  group: string;
  category: string;
  operator: string | null;
  value: string;
  intent: string;
  weight: number | null;
  note: string | null;
  workspaceId: string;
  icpId: string | null;
  personaId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Persona = {
  id: string;
  name: string;
  description: string | null;
  icpId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type Signal = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  strength: number | null;
  icpId: string | null;
  workspaceId: string;
  personaId: string | null;
  segmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
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

type Snapshot = {
  id: string;
  version: number;
  changeSummary: string | null;
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
  icpId: string;
  workspaceId: string;
  snapshotData: unknown;
};

type IcpTabsProps = {
  icp: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    version: number;
    criteria: Criterion[];
    personas: Persona[];
    signals: Signal[];
    segments: Segment[];
    dealStats: DealStats;
  };
  snapshots: Snapshot[];
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

export function IcpTabs({ icp, snapshots }: IcpTabsProps) {
  return (
    <Tabs defaultValue="profile">
      <TabsList variant="line">
        <TabsTrigger value="profile">Criteria</TabsTrigger>
        <TabsTrigger value="personas">Personas</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="segments">Segments</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="history">Versions</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="pt-4">
        <CriteriaGroupedList criteria={icp.criteria} icpId={icp.id} />
      </TabsContent>

      <TabsContent value="personas" className="pt-4">
        <PersonaList personas={icp.personas} icpId={icp.id} />
      </TabsContent>

      <TabsContent value="signals" className="pt-4">
        <SignalList signals={icp.signals} icpId={icp.id} />
      </TabsContent>

      <TabsContent value="segments" className="pt-4">
        <SegmentsTab segments={icp.segments} icpId={icp.id} />
      </TabsContent>

      <TabsContent value="performance" className="pt-4">
        <PerformanceTab dealStats={icp.dealStats} />
      </TabsContent>

      <TabsContent value="history" className="pt-4">
        <IcpVersionHistory icpId={icp.id} snapshots={snapshots} />
      </TabsContent>
    </Tabs>
  );
}

function SegmentsTab({ segments, icpId }: { segments: Segment[]; icpId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href={`/segments/new?icpId=${icpId}`}
          className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          Create Segment
        </Link>
      </div>

      {segments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No segments yet.
        </p>
      ) : (
        <div className="space-y-2">
          {segments.map((segment) => (
            <Link
              key={segment.id}
              href={`/segments/${segment.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{segment.name}</span>
                <Badge variant={statusVariant[segment.status] ?? "outline"}>
                  {segment.status}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                Priority: {segment.priorityScore}/10
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PerformanceTab({ dealStats }: { dealStats: DealStats }) {
  if (dealStats.total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No deal data available yet.
      </p>
    );
  }

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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
