export type GtmContextPackage = {
  schemaVersion: 1;
  exportedAt: string;
  workspace: { name: string };
  product?: {
    companyName: string | null;
    website: string | null;
    productDescription: string;
    targetCustomers: string | null;
    coreUseCases: string[];
    keyValueProps: string[];
    industriesFocus: string[];
    geoFocus: string[];
  };
  products?: Array<{
    name: string;
    shortDescription: string | null;
    description: string | null;
    coreUseCases: string[];
    keyValueProps: string[];
    pricingModel: string | null;
    avgTicket: string | null;
  }>;
  icps?: Array<{
    name: string;
    description: string | null;
    status: string;
    version: number;
    criteria: Array<{
      group: string;
      category: string;
      value: string;
      intent: string;
      weight: number | null;
    }>;
    personas: Array<{
      name: string;
      description: string | null;
    }>;
  }>;
  scoring?: {
    totalRuns: number;
    latestRun?: {
      fileName: string;
      scoredAt: string;
      totalLeads: number;
      breakdown: {
        high: number;
        medium: number;
        low: number;
        risk: number;
        blocked: number;
        unmatched: number;
      };
    };
  };
};

export type ExportModules = {
  product?: boolean;
  icps?: boolean;
  scoring?: boolean;
};

export type ExportFormat = "json" | "markdown" | "clipboard";
