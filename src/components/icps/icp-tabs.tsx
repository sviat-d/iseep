"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { CriteriaGroupedList } from "@/components/criteria/criteria-grouped-list";
import { PersonaList } from "@/components/personas/persona-list";
import { SignalList } from "@/components/signals/signal-list";
import { IcpVersionHistory } from "@/components/icps/icp-version-history";
import { IcpCasesTab } from "@/components/icps/icp-cases-tab";
import { HypothesisTab } from "@/components/hypotheses/hypothesis-tab";

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
  goals: string | null;
  painPoints: string | null;
  triggers: string | null;
  decisionCriteria: string | null;
  objections: string | null;
  desiredOutcome: string | null;
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

type HypothesisItem = {
  id: string;
  name: string;
  productIds: unknown;
  selectedCriteriaIds: unknown;
  selectedPersonaIds: unknown;
  selectedSignalIds: unknown;
  problem: string | null;
  solution: string | null;
  outcome: string | null;
  valueProposition: string | null;
  expectedResult: string | null;
  status: string;
  notes: string | null;
  recipients: number | null;
  positiveReplies: number | null;
  sqls: number | null;
  wonDeals: number | null;
  lostDeals: number | null;
  metricsLeads: number | null;
  metricsReplies: number | null;
  metricsMeetings: number | null;
  metricsOpps: number | null;
  metricsWins: number | null;
  createdAt: Date;
};

type CaseItem = {
  id: string;
  companyName: string;
  companyDomain: string | null;
  outcome: string;
  productIds: unknown;
  segmentId: string | null;
  useCaseId: string | null;
  useCaseIds: unknown;
  channel: string | null;
  channelDetail: string | null;
  reasonTags: unknown;
  hypothesis: string | null;
  hypothesisId: string | null;
  dealValue: string | null;
  dealType: string | null;
  whyWon: string | null;
  whyLost: string | null;
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
    segments: Array<{ id: string; name: string; status: string; priorityScore: number }>;
    dealStats: { total: number; won: number; lost: number; open: number };
  };
  snapshots: Snapshot[];
  cases: CaseItem[];
  hypotheses: HypothesisItem[];
  icpProducts: Array<{ id: string; name: string }>;
  currentProductId?: string;
  useCases?: Array<{ id: string; name: string }>;
  workspaceId?: string;
};

function asIds(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  return [];
}

export function IcpTabs({ icp, snapshots, cases, hypotheses, icpProducts, currentProductId, useCases = [], workspaceId }: IcpTabsProps) {
  // Filter hypotheses and cases by current product (or show all for shared/no product)
  const filteredHypotheses = currentProductId
    ? hypotheses.filter((h) => {
        const pids = asIds(h.productIds);
        return pids.length === 0 || pids.includes(currentProductId);
      })
    : hypotheses;

  const filteredCases = currentProductId
    ? cases.filter((c) => {
        const pids = asIds(c.productIds);
        // Also check legacy productId field
        return pids.length === 0 || pids.includes(currentProductId) || (c as Record<string, unknown>).productId === currentProductId;
      })
    : cases;

  // Group linked cases per hypothesis
  const linkedCasesMap: Record<string, Array<{ id: string; companyName: string; outcome: string; dealValue: string | null }>> = {};
  for (const c of filteredCases) {
    if (c.hypothesisId) {
      if (!linkedCasesMap[c.hypothesisId]) linkedCasesMap[c.hypothesisId] = [];
      linkedCasesMap[c.hypothesisId].push({
        id: c.id,
        companyName: c.companyName,
        outcome: c.outcome,
        dealValue: c.dealValue,
      });
    }
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList variant="line">
        <TabsTrigger value="profile">Criteria</TabsTrigger>
        <TabsTrigger value="personas">Personas</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="hypotheses">Hypotheses</TabsTrigger>
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

      <TabsContent value="hypotheses" className="pt-4">
        <HypothesisTab
          icpId={icp.id}
          icpName={icp.name}
          hypotheses={filteredHypotheses}
          criteria={icp.criteria.map((c) => ({
            id: c.id,
            category: c.category,
            value: c.value,
            intent: c.intent,
            weight: c.weight,
          }))}
          personas={icp.personas.map((p) => ({ id: p.id, name: p.name }))}
          signals={icp.signals.map((s) => ({ id: s.id, type: s.type, label: s.label }))}
          icpProducts={icpProducts}
          currentProductId={currentProductId}
          linkedCasesMap={linkedCasesMap}
        />
      </TabsContent>

      <TabsContent value="cases" className="pt-4">
        <IcpCasesTab
          icpId={icp.id}
          cases={filteredCases}
          segments={icp.segments.map((s) => ({ id: s.id, name: s.name }))}
          hypotheses={filteredHypotheses.map((h) => ({ id: h.id, name: h.name }))}
          icpProducts={icpProducts}
          currentProductId={currentProductId}
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
