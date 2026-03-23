"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { MatchReason } from "@/lib/scoring";
import { evaluateClusterWithAi } from "@/actions/evaluate-cluster";
import type { AiEvaluation } from "@/actions/evaluate-cluster";
import { ProductContextNudge } from "@/components/shared/product-context-nudge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Ban,
  Bot,
  ChevronDown,
  ChevronRight,
  Download,
  Lightbulb,
  Loader2,
  Sparkles,
  Upload,
  ArrowRight,
  Search,
} from "lucide-react";
import type { ClusterEvaluation } from "@/lib/cluster-evaluation";
import { RejectIcpDialog } from "@/components/scoring/reject-icp-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Upload = {
  id: string;
  fileName: string;
  sourceName?: string | null;
  totalRows: number;
  scoredAt: Date;
};

type Lead = {
  id: string;
  companyName: string | null;
  industry: string | null;
  country: string | null;
  bestIcpName: string | null;
  fitScore: number | null;
  confidence: number | null;
  fitLevel: "high" | "medium" | "low" | "risk" | "blocked" | "none";
  matchReasons: unknown;
};

type Stats = {
  total: number;
  high: number;
  medium: number;
  low: number;
  risk: number;
  blocked: number;
  none: number;
};

type Cluster = {
  industry: string;
  leads: Lead[];
  sharedTraits: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fitBadgeVariant(level: string): "default" | "secondary" | "outline" | "destructive" {
  switch (level) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    case "risk":
      return "secondary";
    case "blocked":
      return "destructive";
    case "none":
      return "destructive";
    default:
      return "outline";
  }
}

function fitBadgeLabel(level: string): string {
  switch (level) {
    case "high":
      return "High Fit";
    case "medium":
      return "Medium Fit";
    case "low":
      return "Low Fit";
    case "risk":
      return "Risk";
    case "blocked":
      return "Blocked";
    case "none":
      return "Not ICP";
    default:
      return level;
  }
}

function fitBadgeClassName(level: string): string {
  switch (level) {
    case "risk":
      return "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "blocked":
      return "border-red-900/50 bg-red-900/10 text-red-900 dark:bg-red-950/30 dark:text-red-400";
    default:
      return "";
  }
}

function isAdoptedLead(lead: { matchReasons: unknown }): boolean {
  if (!Array.isArray(lead.matchReasons)) return false;
  return (lead.matchReasons as Record<string, unknown>[]).some(
    (r) => r.matchType === "adopted"
  );
}

function getAdoptedNote(lead: { matchReasons: unknown }): string | null {
  if (!Array.isArray(lead.matchReasons)) return null;
  const adopted = (lead.matchReasons as Record<string, unknown>[]).find(
    (r) => r.matchType === "adopted"
  );
  return adopted ? (adopted.note as string) ?? null : null;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-green-600 dark:text-green-400";
  if (confidence >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function matchTypeIcon(matchType: string): string {
  switch (matchType) {
    case "exact":
    case "case_insensitive":
      return "\u2713";
    case "synonym":
    case "workspace_memory":
      return "~";
    case "ai_mapped":
      return "\uD83E\uDD16";
    case "none":
    default:
      return "\u2717";
  }
}

function matchTypeLabel(matchType: string): string {
  switch (matchType) {
    case "exact":
      return "exact";
    case "case_insensitive":
      return "case match";
    case "synonym":
      return "synonym";
    case "workspace_memory":
      return "learned";
    case "ai_mapped":
      return "AI mapped";
    case "none":
      return "no match";
    default:
      return matchType;
  }
}

function pct(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function pctNum(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function parseMatchReasons(raw: unknown): MatchReason[] {
  if (Array.isArray(raw)) return raw as MatchReason[];
  return [];
}

/** Find the most frequent value in an array */
function mode(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const v of arr) {
    counts[v] = (counts[v] || 0) + 1;
  }
  let maxKey: string | null = null;
  let maxCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }
  return maxKey;
}

// ---------------------------------------------------------------------------
// Insights generator (pure data analysis, no AI)
// ---------------------------------------------------------------------------

function generateInsights(leads: Lead[]): string[] {
  const insights: string[] = [];

  const highFit = leads.filter((l) => l.fitLevel === "high");
  const blocked = leads.filter((l) => l.fitLevel === "blocked");
  const unmatched = leads.filter((l) => l.fitLevel === "none");

  // Most common industry in high fit
  if (highFit.length > 0) {
    const industries = highFit.map((l) => l.industry).filter(Boolean) as string[];
    const topIndustry = mode(industries);
    if (topIndustry) {
      const count = industries.filter((i) => i === topIndustry).length;
      insights.push(
        `Your ICP works best for ${topIndustry} companies (${count} high-fit lead${count !== 1 ? "s" : ""})`,
      );
    }
  }

  // Blocker insights
  if (blocked.length > 0) {
    const blockerCategories: string[] = [];
    for (const lead of blocked) {
      const reasons = parseMatchReasons(lead.matchReasons);
      for (const r of reasons) {
        if (r.intent === "exclude" && r.matched && (r.weight ?? 5) >= 7) {
          blockerCategories.push(r.category);
        }
      }
    }
    const topBlocker = mode(blockerCategories);
    if (topBlocker) {
      insights.push(
        `${blocked.length} lead${blocked.length !== 1 ? "s" : ""} blocked -- most common blocker: ${topBlocker}`,
      );
    } else {
      insights.push(
        `${blocked.length} lead${blocked.length !== 1 ? "s" : ""} blocked -- review your exclusion rules`,
      );
    }
  }

  // Unmatched cluster
  if (unmatched.length >= 3) {
    const industries = unmatched.map((l) => l.industry).filter(Boolean) as string[];
    const topIndustry = mode(industries);
    if (topIndustry) {
      const count = industries.filter((i) => i === topIndustry).length;
      insights.push(
        `${count} unmatched lead${count !== 1 ? "s" : ""} share "${topIndustry}" -- potential new ICP?`,
      );
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Cluster unmatched leads by industry
// ---------------------------------------------------------------------------

function findSharedTraits(leads: Lead[]): string[] {
  const traits: string[] = [];

  // Shared industry
  const industries = leads.map((l) => l.industry).filter(Boolean) as string[];
  const topIndustry = mode(industries);
  if (topIndustry && industries.filter((i) => i === topIndustry).length === leads.length) {
    traits.push(topIndustry);
  }

  // Shared country
  const countries = leads.map((l) => l.country).filter(Boolean) as string[];
  const topCountry = mode(countries);
  if (topCountry) {
    const countryCount = countries.filter((c) => c === topCountry).length;
    if (countryCount > leads.length / 2) {
      traits.push(topCountry);
    }
  }

  return traits;
}

function clusterUnmatchedLeads(leads: Lead[]): Cluster[] {
  const unmatched = leads.filter((l) => l.fitLevel === "none");

  // Group by industry
  const byIndustry: Record<string, Lead[]> = {};
  for (const lead of unmatched) {
    const key = lead.industry || "Unknown";
    if (!byIndustry[key]) byIndustry[key] = [];
    byIndustry[key].push(lead);
  }

  return Object.entries(byIndustry)
    .filter(([, clusterLeads]) => clusterLeads.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([industry, clusterLeads]) => ({
      industry,
      leads: clusterLeads,
      sharedTraits: findSharedTraits(clusterLeads),
    }));
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportLeadsCSV(leads: Lead[], filename: string) {
  const headers = [
    "Company",
    "Industry",
    "Country",
    "Best ICP",
    "Fit Score",
    "Confidence",
    "Fit Level",
  ];
  const rows = leads.map((l) => [
    l.companyName,
    l.industry,
    l.country,
    l.bestIcpName,
    l.fitScore,
    l.confidence,
    l.fitLevel,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${v ?? ""}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Summary Bar (colored segments)
// ---------------------------------------------------------------------------

function SummaryBar({ stats }: { stats: Stats }) {
  const segments = [
    {
      label: "High fit",
      count: stats.high + stats.medium,
      color: "bg-green-500",
      pctLabel: pct(stats.high + stats.medium, stats.total),
    },
    {
      label: "Borderline",
      count: stats.low + stats.risk,
      color: "bg-amber-500",
      pctLabel: pct(stats.low + stats.risk, stats.total),
    },
    {
      label: "Blocked",
      count: stats.blocked,
      color: "bg-red-500",
      pctLabel: pct(stats.blocked, stats.total),
    },
    {
      label: "Unmatched",
      count: stats.none,
      color: "bg-gray-300 dark:bg-gray-600",
      pctLabel: pct(stats.none, stats.total),
    },
  ];

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {segments.map((seg) => {
          const w = pctNum(seg.count, stats.total);
          if (w === 0) return null;
          return (
            <div
              key={seg.label}
              className={`${seg.color} transition-all`}
              style={{ width: `${w}%` }}
              title={`${seg.label}: ${seg.count} (${seg.pctLabel})`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${seg.color}`} />
            {seg.pctLabel} {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fit indicator helpers
// ---------------------------------------------------------------------------

function fitDotClass(level: string): string {
  switch (level) {
    case "high":
      return "bg-green-500";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-gray-400";
    case "none":
      return "border border-gray-400 bg-transparent";
    case "unknown":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
}

function fitLabel(level: string): string {
  switch (level) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "none":
      return "None";
    case "unknown":
      return "Unknown";
    default:
      return level;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

// Product fit sort order: high first, then medium, low, none/unknown last
const FIT_SORT_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
  unknown: 4,
};

export function ScoringResults({
  upload,
  leads,
  stats,
  clusterEvaluations = {},
  hasProductContext = false,
  productDescription,
  excludedIndustries = [],
}: {
  upload: Upload;
  leads: Lead[];
  stats: Stats;
  clusterEvaluations?: Record<string, ClusterEvaluation>;
  hasProductContext?: boolean;
  productDescription?: string;
  excludedIndustries?: string[];
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("best");
  const [aiEvaluations, setAiEvaluations] = useState<Record<string, AiEvaluation>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [rejectedSet, setRejectedSet] = useState<Set<string>>(
    new Set(excludedIndustries.map(s => s.toLowerCase()))
  );

  // Detect AI mapping usage
  const aiMappingUsed = leads.some((lead) => {
    const reasons = parseMatchReasons(lead.matchReasons);
    return reasons.some((r) => r.matchType === "ai_mapped");
  });

  // Pre-compute tab lead groups
  const bestFitLeads = leads.filter(
    (l) => l.fitLevel === "high" || l.fitLevel === "medium",
  );
  const borderlineLeads = leads.filter(
    (l) => l.fitLevel === "low" || l.fitLevel === "risk",
  );
  const blockedLeads = leads.filter((l) => l.fitLevel === "blocked");
  const unmatchedLeads = leads.filter((l) => l.fitLevel === "none");

  // Insights
  const insights = generateInsights(leads);

  // Clusters for unmatched — sorted by product fit and filtered
  const allClusters = clusterUnmatchedLeads(leads);
  const activeClusters = allClusters
    .filter(c => !rejectedSet.has(c.industry.toLowerCase()))
    .sort((a, b) => {
      const evalA = clusterEvaluations[a.industry];
      const evalB = clusterEvaluations[b.industry];
      const fitA = evalA ? (FIT_SORT_ORDER[evalA.productFit] ?? 4) : 4;
      const fitB = evalB ? (FIT_SORT_ORDER[evalB.productFit] ?? 4) : 4;
      if (fitA !== fitB) return fitA - fitB;
      return b.leads.length - a.leads.length; // secondary: lead count desc
    });
  const excludedClusters = allClusters.filter(
    c => rejectedSet.has(c.industry.toLowerCase())
  );

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function getTabLeads(tab: string): Lead[] {
    switch (tab) {
      case "best":
        return bestFitLeads;
      case "borderline":
        return borderlineLeads;
      case "blocked":
        return blockedLeads;
      case "unmatched":
        return unmatchedLeads;
      case "all":
        return leads;
      default:
        return leads;
    }
  }

  const displayName = upload.sourceName || upload.fileName;
  const scoredDate = new Date(upload.scoredAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {!hasProductContext && <ProductContextNudge />}

      {/* ── Section 1: Header + Summary ── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/scoring"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to uploads
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {displayName}
            </h1>
            <p className="text-muted-foreground">
              {upload.totalRows} leads analyzed
              {" \u00b7 "}
              {scoredDate}
              {upload.sourceName && upload.sourceName !== upload.fileName && (
                <>
                  {" \u00b7 "}
                  <span className="text-foreground/70">{upload.fileName}</span>
                </>
              )}
            </p>
            {productDescription && (
              <p className="mt-1 text-sm text-muted-foreground">
                Based on your product:{" "}
                <Link href="/settings/product" className="hover:underline">
                  {productDescription.length > 100
                    ? productDescription.slice(0, 100) + "..."
                    : productDescription}
                </Link>
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {aiMappingUsed ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Scored with AI-assisted matching</span>
                </>
              ) : (
                <span>Scored with exact matching</span>
              )}
            </div>
          </div>

          {/* Header actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportLeadsCSV(leads, `${upload.fileName.replace(/\.csv$/, "")}-all-scored.csv`)
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Link href="/icps">
              <Button variant="outline" size="sm">
                Refine ICP
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary bar */}
        <SummaryBar stats={stats} />
      </div>

      {/* ── Section 2: Insights ── */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Section 3: Tabbed Sections ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="best">
            Best Fits ({bestFitLeads.length})
          </TabsTrigger>
          <TabsTrigger value="borderline">
            Borderline ({borderlineLeads.length})
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Blocked ({blockedLeads.length})
          </TabsTrigger>
          <TabsTrigger value="unmatched">
            Unmatched ({unmatchedLeads.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
        </TabsList>

        {/* Best Fits */}
        <TabsContent value="best" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              These are your best leads -- high and medium fit
            </p>
            {bestFitLeads.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportLeadsCSV(
                    bestFitLeads,
                    `${upload.fileName.replace(/\.csv$/, "")}-best-fits.csv`,
                  )
                }
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export best fits
              </Button>
            )}
          </div>
          <LeadTable
            leads={bestFitLeads}
            expandedRows={expandedRows}
            onToggle={toggleRow}
          />
        </TabsContent>

        {/* Borderline */}
        <TabsContent value="borderline" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Worth exploring, but proceed with caution
          </p>
          <LeadTable
            leads={borderlineLeads}
            expandedRows={expandedRows}
            onToggle={toggleRow}
          />
        </TabsContent>

        {/* Blocked */}
        <TabsContent value="blocked" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Excluded by your rules
          </p>
          <LeadTable
            leads={blockedLeads}
            expandedRows={expandedRows}
            onToggle={toggleRow}
          />
        </TabsContent>

        {/* Unmatched */}
        <TabsContent value="unmatched" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Not in your current ICPs
          </p>

          {/* Cluster display */}
          {allClusters.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4 text-primary" />
                  Potential new ICPs found in unmatched leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeClusters.map((cluster) => (
                    <ClusterCard
                      key={cluster.industry}
                      cluster={cluster}
                      uploadId={upload.id}
                      evaluation={clusterEvaluations[cluster.industry]}
                      aiEvaluation={aiEvaluations[cluster.industry]}
                      aiError={aiErrors[cluster.industry]}
                      hasProductContext={hasProductContext}
                      onAiEvaluation={(industry, evaluation) => {
                        setAiEvaluations((prev) => ({ ...prev, [industry]: evaluation }));
                      }}
                      onAiError={(industry, error) => {
                        setAiErrors((prev) => ({ ...prev, [industry]: error }));
                      }}
                      onRejected={(industry) => {
                        setRejectedSet((prev) => new Set([...prev, industry.toLowerCase()]));
                      }}
                    />
                  ))}
                </div>

                {/* Excluded clusters — greyed out at bottom */}
                {excludedClusters.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Previously rejected
                    </p>
                    {excludedClusters.map((cluster) => (
                      <div
                        key={cluster.industry}
                        className="rounded-lg border border-dashed p-3 opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {cluster.industry} ({cluster.leads.length}{" "}
                            lead{cluster.leads.length !== 1 ? "s" : ""})
                            {" -- "}marked as not a fit
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Product context prompt */}
                {!hasProductContext && (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-dashed p-3">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Add product context to get smarter segment recommendations
                      </p>
                      <Link
                        href="/settings/product"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1"
                      >
                        Set up product context
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <LeadTable
            leads={unmatchedLeads}
            expandedRows={expandedRows}
            onToggle={toggleRow}
          />
        </TabsContent>

        {/* All */}
        <TabsContent value="all" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              All {stats.total} scored leads
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportLeadsCSV(
                  leads,
                  `${upload.fileName.replace(/\.csv$/, "")}-all-scored.csv`,
                )
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export all
            </Button>
          </div>
          <LeadTable
            leads={leads}
            expandedRows={expandedRows}
            onToggle={toggleRow}
          />
        </TabsContent>
      </Tabs>

      {/* ── Section 5: Bottom Actions ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
        <Button
          variant="outline"
          onClick={() =>
            exportLeadsCSV(
              bestFitLeads,
              `${upload.fileName.replace(/\.csv$/, "")}-best-fits.csv`,
            )
          }
          disabled={bestFitLeads.length === 0}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export high-fit leads (CSV)
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            exportLeadsCSV(
              leads,
              `${upload.fileName.replace(/\.csv$/, "")}-all-scored.csv`,
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export all scored (CSV)
        </Button>
        <Link href="/icps">
          <Button variant="outline">
            Refine ICP
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/scoring/upload">
          <Button variant="outline">
            <Upload className="mr-1.5 h-4 w-4" />
            Score another list
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lead Table (reusable for each tab)
// ---------------------------------------------------------------------------

function LeadTable({
  leads,
  expandedRows,
  onToggle,
}: {
  leads: Lead[];
  expandedRows: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        No leads in this category
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Company</TableHead>
          <TableHead>Industry</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>ICP Match</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Fit Level</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => {
          const isExpanded = expandedRows.has(lead.id);
          const reasons = parseMatchReasons(lead.matchReasons);
          return (
            <LeadRow
              key={lead.id}
              lead={lead}
              reasons={reasons}
              isExpanded={isExpanded}
              onToggle={() => onToggle(lead.id)}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Cluster Card (with AI evaluation)
// ---------------------------------------------------------------------------

function ClusterCard({
  cluster,
  uploadId,
  evaluation,
  aiEvaluation,
  aiError,
  hasProductContext,
  onAiEvaluation,
  onAiError,
  onRejected,
}: {
  cluster: Cluster;
  uploadId: string;
  evaluation?: ClusterEvaluation;
  aiEvaluation?: AiEvaluation;
  aiError?: string;
  hasProductContext: boolean;
  onAiEvaluation: (industry: string, evaluation: AiEvaluation) => void;
  onAiError: (industry: string, error: string) => void;
  onRejected?: (industry: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const clusterConfidence = evaluation?.confidence
    ? evaluation.confidence.charAt(0).toUpperCase() + evaluation.confidence.slice(1)
    : cluster.leads.length >= 5
      ? "High"
      : cluster.leads.length >= 3
        ? "Medium"
        : "Low";
  const exampleNames = cluster.leads
    .slice(0, 3)
    .map((l) => l.companyName || "Unknown")
    .join(", ");
  const remaining = cluster.leads.length - 3;

  const countries = [
    ...new Set(
      cluster.leads
        .map((l) => l.country)
        .filter((c): c is string => Boolean(c?.trim()))
    ),
  ];
  const companyNames = cluster.leads
    .map((l) => l.companyName)
    .filter((n): n is string => Boolean(n));

  function handleEvaluate() {
    startTransition(async () => {
      const result = await evaluateClusterWithAi(
        cluster.industry,
        countries,
        companyNames,
        cluster.leads.length,
      );
      if (result.error) {
        onAiError(cluster.industry, result.error);
      } else if (result.evaluation) {
        onAiEvaluation(cluster.industry, result.evaluation);
      }
    });
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">
            {cluster.industry} ({cluster.leads.length}{" "}
            lead{cluster.leads.length !== 1 ? "s" : ""})
          </p>
        </div>
        <span
          className={`text-xs font-medium ${
            clusterConfidence === "High"
              ? "text-green-600 dark:text-green-400"
              : clusterConfidence === "Medium"
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          }`}
        >
          {clusterConfidence} confidence
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {exampleNames}
        {remaining > 0 && ` +${remaining} more`}
      </p>

      {/* Evaluation indicators */}
      {evaluation && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${fitDotClass(evaluation.icpSimilarity)}`} />
            <span className="text-muted-foreground">
              ICP similarity:{" "}
              <span className="text-foreground font-medium">{fitLabel(evaluation.icpSimilarity)}</span>
              {evaluation.icpSimilarity === "none" && " -- not in current ICPs"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${fitDotClass(evaluation.productFit)}`} />
            <span className="text-muted-foreground">
              Product fit:{" "}
              <span className="text-foreground font-medium">{fitLabel(evaluation.productFit)}</span>
              {evaluation.productFit === "unknown" && (
                <span> -- add product context for better suggestions</span>
              )}
              {evaluation.productFitReason && (
                <span> -- {evaluation.productFitReason.toLowerCase()}</span>
              )}
            </span>
          </div>
          {evaluation.explanation && evaluation.productFit !== "unknown" && evaluation.productFit !== "none" && (
            <p className="text-xs italic text-muted-foreground pl-4">
              &ldquo;{evaluation.explanation}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* AI Evaluation result */}
      {aiEvaluation && (
        <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3 mt-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Bot className="h-3.5 w-3.5 text-primary" />
            AI Analysis
          </div>
          <p className="text-xs text-muted-foreground">
            Fit probability:{" "}
            <span className="font-medium text-foreground capitalize">{aiEvaluation.fitProbability}</span>
            {" \u00b7 "}
            Sell probability:{" "}
            <span className="font-medium text-foreground capitalize">{aiEvaluation.sellProbability}</span>
          </p>
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{aiEvaluation.reasoning}&rdquo;
          </p>
          {aiEvaluation.potentialUseCases.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-muted-foreground">Potential use cases:</p>
              <ul className="mt-0.5 space-y-0.5 text-muted-foreground">
                {aiEvaluation.potentialUseCases.map((uc, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                    {uc}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aiEvaluation.risks.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-muted-foreground">Risks:</p>
              <ul className="mt-0.5 space-y-0.5 text-muted-foreground">
                {aiEvaluation.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
            &ldquo;{aiEvaluation.recommendation}&rdquo;
          </p>
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <p className="text-xs text-destructive mt-1">{aiError}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/scoring/${uploadId}/review-cluster?industry=${encodeURIComponent(cluster.industry)}`}
        >
          <Button variant="outline" size="xs">
            Review suggested ICP
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
        {!aiEvaluation && hasProductContext && (
          <Button
            variant="outline"
            size="xs"
            onClick={handleEvaluate}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Bot className="mr-1 h-3 w-3" />
                Evaluate with AI
              </>
            )}
          </Button>
        )}
        <RejectIcpDialog
          industry={cluster.industry}
          onRejected={() => onRejected?.(cluster.industry)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lead Row (with expandable detail)
// ---------------------------------------------------------------------------

function LeadRow({
  lead,
  reasons,
  isExpanded,
  onToggle,
}: {
  lead: Lead;
  reasons: MatchReason[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colSpan = 8;
  const confidence = lead.confidence ?? 0;
  const customBadgeClass = fitBadgeClassName(lead.fitLevel);

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={onToggle}
      >
        <TableCell className="w-8 px-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">
          {lead.companyName || "\u2014"}
        </TableCell>
        <TableCell>{lead.industry || "\u2014"}</TableCell>
        <TableCell>{lead.country || "\u2014"}</TableCell>
        <TableCell>{lead.bestIcpName || "\u2014"}</TableCell>
        <TableCell>
          <span className="font-mono text-sm">{lead.fitScore ?? 0}</span>
        </TableCell>
        <TableCell>
          <span className={`font-mono text-sm ${confidenceColor(confidence)}`}>
            {confidence}%
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            {customBadgeClass ? (
              <Badge variant="outline" className={customBadgeClass}>
                {fitBadgeLabel(lead.fitLevel)}
              </Badge>
            ) : (
              <Badge variant={fitBadgeVariant(lead.fitLevel)}>
                {fitBadgeLabel(lead.fitLevel)}
              </Badge>
            )}
            {isAdoptedLead(lead) && (
              <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px]">
                Adopted
              </Badge>
            )}
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={colSpan} className="p-0">
            <MatchDetail
              lead={lead}
              reasons={reasons}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Match Detail Panel
// ---------------------------------------------------------------------------

function MatchDetail({
  lead,
  reasons,
}: {
  lead: Lead;
  reasons: MatchReason[];
}) {
  if (reasons.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-muted-foreground">
        No match details available (no active ICPs or criteria)
      </div>
    );
  }

  const qualifyReasons = reasons.filter((r) => r.intent === "qualify");
  const excludeReasons = reasons.filter((r) => r.intent === "exclude");
  const riskReasons = reasons.filter((r) => r.intent === "risk");

  const blockerMatches = excludeReasons.filter((r) => r.matched && (r.weight ?? 5) >= 7);
  const riskMatches = riskReasons.filter((r) => r.matched);

  // Confidence breakdown
  const totalCategories = new Set(reasons.map((r) => r.category)).size;
  const presentCategories = new Set(
    reasons.filter((r) => r.leadValue).map((r) => r.category),
  ).size;
  const matchedReasons = reasons.filter((r) => r.matched);
  const exactCount = matchedReasons.filter(
    (r) =>
      r.matchType === "exact" ||
      r.matchType === "case_insensitive" ||
      r.matchType === "synonym",
  ).length;
  const exactPct =
    matchedReasons.length > 0
      ? Math.round((exactCount / matchedReasons.length) * 100)
      : 0;

  return (
    <div className="space-y-3 px-6 py-4">
      <p className="text-sm font-medium">
        Match details for{" "}
        <span className="text-foreground">
          &ldquo;{lead.companyName || "Unknown"}&rdquo;
        </span>
        {lead.bestIcpName && (
          <>
            {" \u2192 "}
            <span className="text-foreground">{lead.bestIcpName}</span>
          </>
        )}
        {" "}
        <span className="text-muted-foreground">
          (Score: {lead.fitScore ?? 0}, Confidence: {lead.confidence ?? 0}%)
        </span>
      </p>

      {/* Confidence breakdown */}
      <div className="rounded-md border border-muted bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Data completeness: {presentCategories}/{totalCategories} fields
        {" \u00b7 "}
        Match quality: {exactPct}% exact/synonym
      </div>

      {/* Blockers section */}
      {blockerMatches.length > 0 && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
            Blockers
          </p>
          {blockerMatches.map((r, i) => (
            <p key={`blocker-${i}`} className="text-sm text-red-700 dark:text-red-400">
              {r.category} = &ldquo;{r.leadValue}&rdquo; (excluded by: {r.criterionValue})
            </p>
          ))}
        </div>
      )}

      {/* Risk flags section */}
      {riskMatches.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
            Risk Flags
          </p>
          {riskMatches.map((r, i) => (
            <p key={`risk-${i}`} className="text-sm text-amber-700 dark:text-amber-400">
              {r.category} = &ldquo;{r.leadValue}&rdquo; (risk criterion: {r.criterionValue})
            </p>
          ))}
        </div>
      )}

      {/* Qualify criteria */}
      {qualifyReasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Qualification Criteria
          </p>
          {qualifyReasons.map((r, i) => (
            <ReasonLine key={`q-${i}`} reason={r} />
          ))}
        </div>
      )}

      {/* Exclude criteria (non-blocker) */}
      {excludeReasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
            Exclusions
          </p>
          {excludeReasons.map((r, i) => (
            <ReasonLine key={`e-${i}`} reason={r} />
          ))}
        </div>
      )}

      {/* Risk criteria */}
      {riskReasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
            Risk Factors
          </p>
          {riskReasons.map((r, i) => (
            <ReasonLine key={`r-${i}`} reason={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reason Line
// ---------------------------------------------------------------------------

function ReasonLine({ reason }: { reason: MatchReason }) {
  const icon = matchTypeIcon(reason.matchType);
  const typeLabel = matchTypeLabel(reason.matchType);
  const weightLabel =
    reason.weight !== null ? ` \u2014 weight: ${reason.weight}` : "";

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0 text-xs leading-none font-mono">
        {icon}
      </span>
      <span>
        <span className="font-medium capitalize">{reason.category}</span>
        {" = "}
        <span>{reason.criterionValue}</span>
        {" (lead: "}
        <span className="text-muted-foreground">
          {reason.leadValue || "\u2014"}
          {reason.resolvedLeadValue &&
            reason.resolvedLeadValue !== reason.leadValue && (
              <>
                {" \u2192 "}
                &ldquo;{reason.resolvedLeadValue}&rdquo;
              </>
            )}
        </span>
        {")"}
        <span className="ml-1.5 text-xs text-muted-foreground">
          [{typeLabel}]
        </span>
        <span className="text-muted-foreground">{weightLabel}</span>
      </span>
    </div>
  );
}
