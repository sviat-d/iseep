"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchReason } from "@/lib/scoring";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  XCircle,
  Sparkles,
  ShieldAlert,
  ShieldBan,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Upload = {
  id: string;
  fileName: string;
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

function confidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-green-600 dark:text-green-400";
  if (confidence >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function matchTypeIcon(matchType: string): string {
  switch (matchType) {
    case "exact":
    case "case_insensitive":
      return "\u2713"; // check mark
    case "synonym":
    case "workspace_memory":
      return "~";
    case "ai_mapped":
      return "\uD83E\uDD16"; // robot emoji
    case "none":
    default:
      return "\u2717"; // X mark
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

function parseMatchReasons(raw: unknown): MatchReason[] {
  if (Array.isArray(raw)) return raw as MatchReason[];
  return [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScoringResults({
  upload,
  leads,
  stats,
}: {
  upload: Upload;
  leads: Lead[];
  stats: Stats;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");

  // Detect if AI mapping was used by checking match types
  const aiMappingUsed = leads.some((lead) => {
    const reasons = parseMatchReasons(lead.matchReasons);
    return reasons.some((r) => r.matchType === "ai_mapped");
  });

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

  const filteredLeads =
    activeTab === "all"
      ? leads
      : leads.filter((l) => l.fitLevel === activeTab);

  const statCards = [
    {
      label: "High Fit",
      count: stats.high,
      pct: pct(stats.high, stats.total),
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Medium Fit",
      count: stats.medium,
      pct: pct(stats.medium, stats.total),
      icon: Minus,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Low Fit",
      count: stats.low,
      pct: pct(stats.low, stats.total),
      icon: TrendingDown,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    {
      label: "Risk",
      count: stats.risk,
      pct: pct(stats.risk, stats.total),
      icon: ShieldAlert,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Blocked",
      count: stats.blocked,
      pct: pct(stats.blocked, stats.total),
      icon: ShieldBan,
      color: "text-red-900 dark:text-red-400",
      bg: "bg-red-900/10",
    },
    {
      label: "Not ICP",
      count: stats.none,
      pct: pct(stats.none, stats.total),
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/scoring"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to uploads
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {upload.fileName}
          </h1>
          <p className="text-muted-foreground">
            {upload.totalRows} leads scored on{" "}
            {new Date(upload.scoredAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
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
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`rounded-md p-1.5 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.pct} of total</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Table */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="high">High ({stats.high})</TabsTrigger>
          <TabsTrigger value="medium">Medium ({stats.medium})</TabsTrigger>
          <TabsTrigger value="low">Low ({stats.low})</TabsTrigger>
          <TabsTrigger value="risk">Risk ({stats.risk})</TabsTrigger>
          <TabsTrigger value="blocked">Blocked ({stats.blocked})</TabsTrigger>
          <TabsTrigger value="none">Not ICP ({stats.none})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredLeads.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No leads in this category
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Best ICP</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Fit Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const isExpanded = expandedRows.has(lead.id);
                  const reasons = parseMatchReasons(lead.matchReasons);
                  return (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      reasons={reasons}
                      isExpanded={isExpanded}
                      onToggle={() => toggleRow(lead.id)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
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
          {customBadgeClass ? (
            <Badge variant="outline" className={customBadgeClass}>
              {fitBadgeLabel(lead.fitLevel)}
            </Badge>
          ) : (
            <Badge variant={fitBadgeVariant(lead.fitLevel)}>
              {fitBadgeLabel(lead.fitLevel)}
            </Badge>
          )}
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
