export type ActionResult = {
  error?: string;
  success?: boolean;
};

export type IcpSnapshotData = {
  schemaVersion: 1;
  icp: {
    name: string;
    description: string | null;
    status: string;
  };
  criteria: Array<{
    group: string;
    category: string;
    operator: string | null;
    value: string;
    intent: string;
    weight: number | null;
    note: string | null;
  }>;
  personas: Array<{
    name: string;
    description: string | null;
  }>;
  signals: Array<{
    type: string;
    label: string;
    description: string | null;
    strength: number | null;
  }>;
  stats: {
    qualifyCount: number;
    excludeCount: number;
    personaCount: number;
    signalCount: number;
    dealCount: number;
    wonCount: number;
    lostCount: number;
  };
};
