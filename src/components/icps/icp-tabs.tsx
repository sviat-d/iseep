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
import { IcpCasesTab } from "@/components/icps/icp-cases-tab";

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

type CaseItem = {
  id: string;
  companyName: string;
  companyDomain: string | null;
  outcome: string;
  segmentId: string | null;
  useCaseId: string | null;
  useCaseIds: unknown;
  channel: string | null;
  channelDetail: string | null;
  reasonTags: unknown;
  hypothesis: string | null;
  note: string | null;
  createdAt: Date;
};

type Snapshot = {
  id: string;
  version: number;
  changeSummary: string | null;
  note: string | null;
  source: string | null;
  tags: unknown;
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
    dealStats: { total: number; won: number; lost: number; open: number };
  };
  snapshots: Snapshot[];
  cases: CaseItem[];
  currentProductId?: string;
  useCases?: Array<{ id: string; name: string }>;
  workspaceId?: string;
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

export function IcpTabs({ icp, snapshots, cases, currentProductId, useCases = [], workspaceId }: IcpTabsProps) {
  return (
    <Tabs defaultValue="profile">
      <TabsList variant="line">
        <TabsTrigger value="profile">Criteria</TabsTrigger>
        <TabsTrigger value="personas">Personas</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="segments">Segments</TabsTrigger>
        <TabsTrigger value="cases">Cases</TabsTrigger>
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

      <TabsContent value="cases" className="pt-4">
        <IcpCasesTab
          icpId={icp.id}
          cases={cases}
          segments={icp.segments.map((s) => ({ id: s.id, name: s.name }))}
          productId={currentProductId}
          useCases={useCases}
          workspaceId={workspaceId}
        />
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
