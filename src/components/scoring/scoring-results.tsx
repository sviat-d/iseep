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
  fitLevel: "high" | "medium" | "low" | "none";
  matchReasons: unknown;
};

type Stats = {
  total: number;
  high: number;
  medium: number;
  low: number;
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
    case "none":
      return "Not ICP";
    default:
      return level;
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

  // Detect if AI mapping was used by checking if any lead has mappedFrom in reasons
  const aiMappingUsed = leads.some((lead) => {
    const reasons = parseMatchReasons(lead.matchReasons);
    return reasons.some((r) => r.mappedFrom);
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  const colSpan = 7;

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
          <Badge variant={fitBadgeVariant(lead.fitLevel)}>
            {fitBadgeLabel(lead.fitLevel)}
          </Badge>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={colSpan} className="p-0">
            <MatchDetail
              companyName={lead.companyName}
              icpName={lead.bestIcpName}
              score={lead.fitScore ?? 0}
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
  companyName,
  icpName,
  score,
  reasons,
}: {
  companyName: string | null;
  icpName: string | null;
  score: number;
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
  const hasExcludeMatch = excludeReasons.some((r) => r.matched);

  return (
    <div className="space-y-3 px-6 py-4">
      <p className="text-sm font-medium">
        Match details for{" "}
        <span className="text-foreground">
          &ldquo;{companyName || "Unknown"}&rdquo;
        </span>
        {icpName && (
          <>
            {" \u2192 "}
            <span className="text-foreground">{icpName}</span>
          </>
        )}
        {" "}
        <span className="text-muted-foreground">(Score: {score})</span>
      </p>

      {/* Qualify criteria */}
      {qualifyReasons.length > 0 && (
        <div className="space-y-1">
          {qualifyReasons.map((r, i) => (
            <ReasonLine key={`q-${i}`} reason={r} />
          ))}
        </div>
      )}

      {/* Exclude */}
      {excludeReasons.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
            Exclusions
          </p>
          {excludeReasons.map((r, i) => (
            <ReasonLine key={`e-${i}`} reason={r} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No exclude matches</p>
      )}

      {/* Risk */}
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

      {hasExcludeMatch && (
        <p className="text-xs text-destructive font-medium">
          Score set to 0 due to exclusion match
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reason Line
// ---------------------------------------------------------------------------

function ReasonLine({ reason }: { reason: MatchReason }) {
  const icon = reason.matched ? "\u2705" : "\u274C";
  const weightLabel =
    reason.weight !== null ? ` \u2014 weight: ${reason.weight}` : "";

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0 text-xs leading-none">{icon}</span>
      <span>
        <span className="font-medium capitalize">{reason.category}</span>
        {" = "}
        <span>{reason.value}</span>
        {" (lead: "}
        <span className="text-muted-foreground">
          {reason.mappedFrom ? (
            <>
              &ldquo;{reason.mappedFrom}&rdquo;{" \u2192 "}mapped to &ldquo;{reason.leadValue}&rdquo;
            </>
          ) : (
            reason.leadValue || "\u2014"
          )}
        </span>
        {")"}
        <span className="text-muted-foreground">{weightLabel}</span>
      </span>
    </div>
  );
}
