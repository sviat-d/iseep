# GTM Context Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified GTM context export system so users can share product, ICP, and scoring context with partners, AI agents, and teams in multiple formats.

**Architecture:** Server-side context builders compose data from existing queries into a `GtmContextPackage`. Pure formatter functions render packages into JSON, Markdown, or compact text. A central `/export` page provides full control, while contextual buttons on key pages enable quick copy.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Drizzle ORM, shadcn/ui, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-24-gtm-context-export-design.md`

---

### Task 1: Types — GtmContextPackage and friends

**Files:**
- Create: `src/lib/context-export/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/lib/context-export/types.ts

export type GtmContextPackage = {
  schemaVersion: 1;
  exportedAt: string;

  workspace: {
    name: string;
  };

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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/context-export/types.ts
git commit -m "feat: add GtmContextPackage types for context export"
```

---

### Task 2: Context Builders

**Files:**
- Create: `src/lib/context-export/builders.ts`
- Modify: `src/lib/queries/workspace.ts` (add `getWorkspaceName`)

**Reference existing queries:**
- `src/lib/queries/product-context.ts` — `getProductContext(workspaceId)`
- `src/lib/queries/icps.ts` — `getIcps(workspaceId)`, `getIcp(id, workspaceId)`
- `src/lib/queries/scoring.ts` — `getScoredUploads(workspaceId)`, `getScoredLeadStats(uploadId, workspaceId)`

- [ ] **Step 1: Add getWorkspaceName to workspace queries**

Add to `src/lib/queries/workspace.ts`:

```typescript
export async function getWorkspaceName(workspaceId: string): Promise<string> {
  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  return ws?.name ?? "Workspace";
}
```

- [ ] **Step 2: Create builders.ts**

```typescript
// src/lib/context-export/builders.ts

import type { GtmContextPackage, ExportModules } from "./types";
import { getProductContext } from "@/lib/queries/product-context";
import { getIcps, getIcp } from "@/lib/queries/icps";
import { getScoredUploads, getScoredLeadStats } from "@/lib/queries/scoring";
import { getWorkspaceName } from "@/lib/queries/workspace";

export async function buildFullContext(
  workspaceId: string,
  modules: ExportModules = {},
): Promise<GtmContextPackage> {
  const {
    product: includeProduct = true,
    icps: includeIcps = true,
    scoring: includeScoring = true,
  } = modules;

  const workspaceName = await getWorkspaceName(workspaceId);

  const pkg: GtmContextPackage = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace: { name: workspaceName },
  };

  if (includeProduct) {
    const ctx = await getProductContext(workspaceId);
    if (ctx) {
      pkg.product = {
        companyName: ctx.companyName,
        website: ctx.website,
        productDescription: ctx.productDescription,
        targetCustomers: ctx.targetCustomers,
        coreUseCases: (ctx.coreUseCases as string[]) ?? [],
        keyValueProps: (ctx.keyValueProps as string[]) ?? [],
        industriesFocus: (ctx.industriesFocus as string[]) ?? [],
        geoFocus: (ctx.geoFocus as string[]) ?? [],
      };
    }
  }

  if (includeIcps) {
    const allIcps = await getIcps(workspaceId);
    const activeIcps = allIcps.filter((i) => i.status === "active");

    if (activeIcps.length > 0) {
      const detailed = await Promise.all(
        activeIcps.map((i) => getIcp(i.id, workspaceId)),
      );

      pkg.icps = detailed
        .filter((d) => d !== null)
        .map((d) => ({
          name: d.name,
          description: d.description,
          status: d.status,
          version: d.version,
          criteria: d.criteria.map((c) => ({
            group: c.group,
            category: c.category,
            value: c.value,
            intent: c.intent,
            weight: c.weight,
          })),
          personas: d.personas.map((p) => ({
            name: p.name,
            description: p.description,
          })),
        }));
    }
  }

  if (includeScoring) {
    const uploads = await getScoredUploads(workspaceId);
    pkg.scoring = { totalRuns: uploads.length };

    if (uploads.length > 0) {
      const latest = uploads[0]; // already sorted desc by createdAt
      const stats = await getScoredLeadStats(latest.id, workspaceId);
      pkg.scoring.latestRun = {
        fileName: latest.fileName,
        scoredAt: latest.scoredAt.toISOString(),
        totalLeads: latest.totalRows,
        breakdown: {
          high: stats.high,
          medium: stats.medium,
          low: stats.low,
          risk: stats.risk,
          blocked: stats.blocked,
          unmatched: stats.none, // DB field "none" → output "unmatched"
        },
      };
    }
  }

  return pkg;
}

export async function buildProductContext(
  workspaceId: string,
): Promise<GtmContextPackage> {
  return buildFullContext(workspaceId, {
    product: true,
    icps: false,
    scoring: false,
  });
}

export async function buildIcpContext(
  workspaceId: string,
  icpId: string,
): Promise<GtmContextPackage> {
  const workspaceName = await getWorkspaceName(workspaceId);
  const ctx = await getProductContext(workspaceId);
  const icp = await getIcp(icpId, workspaceId);

  const pkg: GtmContextPackage = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace: { name: workspaceName },
  };

  if (ctx) {
    pkg.product = {
      companyName: ctx.companyName,
      website: ctx.website,
      productDescription: ctx.productDescription,
      targetCustomers: ctx.targetCustomers,
      coreUseCases: (ctx.coreUseCases as string[]) ?? [],
      keyValueProps: (ctx.keyValueProps as string[]) ?? [],
      industriesFocus: (ctx.industriesFocus as string[]) ?? [],
      geoFocus: (ctx.geoFocus as string[]) ?? [],
    };
  }

  if (icp) {
    pkg.icps = [
      {
        name: icp.name,
        description: icp.description,
        status: icp.status,
        version: icp.version,
        criteria: icp.criteria.map((c) => ({
          group: c.group,
          category: c.category,
          value: c.value,
          intent: c.intent,
          weight: c.weight,
        })),
        personas: icp.personas.map((p) => ({
          name: p.name,
          description: p.description,
        })),
      },
    ];
  }

  return pkg;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/context-export/builders.ts src/lib/queries/workspace.ts
git commit -m "feat: add GTM context builders (full, product, single ICP)"
```

---

### Task 3: Formatters

**Files:**
- Create: `src/lib/context-export/formatters.ts`

- [ ] **Step 1: Create formatters.ts**

```typescript
// src/lib/context-export/formatters.ts

import type { GtmContextPackage } from "./types";

// ── JSON ────────────────────────────────────────────────────────────────────

export function toJson(pkg: GtmContextPackage): string {
  return JSON.stringify(pkg, null, 2);
}

// ── Markdown ────────────────────────────────────────────────────────────────

export function toMarkdown(pkg: GtmContextPackage): string {
  const lines: string[] = [];
  const companyName = pkg.product?.companyName ?? pkg.workspace.name;

  lines.push(`# ${companyName} — GTM Context\n`);

  // Product section
  if (pkg.product) {
    const p = pkg.product;
    lines.push("## Product\n");
    lines.push(p.productDescription + "\n");

    if (p.targetCustomers) lines.push(`**Target customers:** ${p.targetCustomers}\n`);
    if (p.industriesFocus.length > 0) lines.push(`**Industries:** ${p.industriesFocus.join(", ")}\n`);
    if (p.geoFocus.length > 0) lines.push(`**Regions:** ${p.geoFocus.join(", ")}\n`);

    if (p.coreUseCases.length > 0) {
      lines.push("\n### Use Cases\n");
      p.coreUseCases.forEach((uc) => lines.push(`- ${uc}`));
      lines.push("");
    }

    if (p.keyValueProps.length > 0) {
      lines.push("### Value Propositions\n");
      p.keyValueProps.forEach((vp) => lines.push(`- ${vp}`));
      lines.push("");
    }
  }

  // ICPs section
  if (pkg.icps && pkg.icps.length > 0) {
    for (const icp of pkg.icps) {
      lines.push("---\n");
      lines.push(`## ICP: ${icp.name}\n`);
      if (icp.description) lines.push(icp.description + "\n");
      lines.push(`**Status:** ${icp.status} | **Version:** ${icp.version}\n`);

      const qualify = icp.criteria.filter((c) => c.intent === "qualify");
      const risk = icp.criteria.filter((c) => c.intent === "risk");
      const exclude = icp.criteria.filter((c) => c.intent === "exclude");

      if (qualify.length > 0) {
        lines.push("### Qualifying Criteria\n");
        lines.push("| Category | Value | Weight |");
        lines.push("|----------|-------|--------|");
        qualify.forEach((c) =>
          lines.push(`| ${c.category} | ${c.value} | ${c.weight ?? "-"}/10 |`),
        );
        lines.push("");
      }

      if (risk.length > 0) {
        lines.push("### Risk Signals\n");
        risk.forEach((c) => lines.push(`- ${c.category}: ${c.value}`));
        lines.push("");
      }

      if (exclude.length > 0) {
        lines.push("### Exclusions\n");
        exclude.forEach((c) => lines.push(`- ${c.category}: ${c.value}`));
        lines.push("");
      }

      if (icp.personas.length > 0) {
        lines.push("### Personas\n");
        icp.personas.forEach((p) =>
          lines.push(`- **${p.name}**${p.description ? ` — ${p.description}` : ""}`),
        );
        lines.push("");
      }
    }
  }

  // Scoring section
  if (pkg.scoring?.latestRun) {
    const r = pkg.scoring.latestRun;
    const borderline = r.breakdown.medium + r.breakdown.low + r.breakdown.risk;
    lines.push("---\n");
    lines.push("## Scoring Summary\n");
    lines.push(`Latest run: ${r.fileName} (${r.totalLeads} leads, ${r.scoredAt.split("T")[0]})\n`);
    lines.push(`- High fit: ${r.breakdown.high}`);
    lines.push(`- Borderline: ${borderline}`);
    lines.push(`- Blocked: ${r.breakdown.blocked}`);
    lines.push(`- Unmatched: ${r.breakdown.unmatched}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Compact clipboard text ──────────────────────────────────────────────────

export function toClipboardText(pkg: GtmContextPackage): string {
  const lines: string[] = [];
  const companyName = pkg.product?.companyName ?? pkg.workspace.name;

  // Product
  if (pkg.product) {
    const p = pkg.product;
    lines.push(`COMPANY: ${companyName}${p.website ? ` (${p.website})` : ""}`);
    lines.push(p.productDescription);
    if (p.targetCustomers) lines.push(`Target: ${p.targetCustomers}`);
    if (p.industriesFocus.length > 0) lines.push(`Industries: ${p.industriesFocus.join(", ")}`);
    if (p.geoFocus.length > 0) lines.push(`Regions: ${p.geoFocus.join(", ")}`);
    if (p.coreUseCases.length > 0) lines.push(`Use cases: ${p.coreUseCases.join(", ")}`);
    if (p.keyValueProps.length > 0) lines.push(`Value props: ${p.keyValueProps.join(", ")}`);
    lines.push("");
  }

  // ICPs
  if (pkg.icps && pkg.icps.length > 0) {
    for (const icp of pkg.icps) {
      lines.push("---");
      lines.push(`ICP: ${icp.name} [${icp.status}, v${icp.version}]`);
      if (icp.description) lines.push(icp.description);

      const qualify = icp.criteria.filter((c) => c.intent === "qualify");
      const risk = icp.criteria.filter((c) => c.intent === "risk");
      const exclude = icp.criteria.filter((c) => c.intent === "exclude");

      if (qualify.length > 0) {
        lines.push(
          `Criteria (qualify): ${qualify.map((c) => `${c.category}=${c.value}${c.weight ? ` (${c.weight})` : ""}`).join(", ")}`,
        );
      }
      if (risk.length > 0) {
        lines.push(
          `Criteria (risk): ${risk.map((c) => `${c.category}=${c.value}`).join(", ")}`,
        );
      }
      if (exclude.length > 0) {
        lines.push(
          `Criteria (exclude): ${exclude.map((c) => `${c.category}=${c.value}`).join(", ")}`,
        );
      }
      if (icp.personas.length > 0) {
        lines.push(`Personas: ${icp.personas.map((p) => p.name).join(", ")}`);
      }
      lines.push("");
    }
  }

  // Scoring
  if (pkg.scoring?.latestRun) {
    const r = pkg.scoring.latestRun;
    const borderline = r.breakdown.medium + r.breakdown.low + r.breakdown.risk;
    lines.push("---");
    lines.push(
      `SCORING: ${r.fileName} (${r.totalLeads} leads, ${r.scoredAt.split("T")[0]})`,
    );
    lines.push(
      `High: ${r.breakdown.high} | Borderline: ${borderline} | Blocked: ${r.breakdown.blocked} | Unmatched: ${r.breakdown.unmatched}`,
    );
    lines.push("");
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/context-export/formatters.ts
git commit -m "feat: add GTM context formatters (JSON, Markdown, clipboard text)"
```

---

### Task 4: ContextExportButton — reusable copy + download

**Files:**
- Create: `src/components/shared/context-export-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/context-export-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, FileDown } from "lucide-react";
import type { GtmContextPackage } from "@/lib/context-export/types";
import { toJson, toMarkdown, toClipboardText } from "@/lib/context-export/formatters";

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ContextExportButton({
  context,
  label = "Copy context",
}: {
  context: GtmContextPackage;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(toClipboardText(context));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const companySlug = (context.product?.companyName ?? context.workspace.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="relative inline-flex">
      <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-r-none">
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="mr-1.5 h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : label}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="-ml-px rounded-l-none border-l px-1.5"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                downloadFile(toMarkdown(context), `${companySlug}-gtm-context.md`);
                setMenuOpen(false);
              }}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download as Markdown
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                downloadFile(toJson(context), `${companySlug}-gtm-context.json`);
                setMenuOpen(false);
              }}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/context-export-button.tsx
git commit -m "feat: add ContextExportButton component (copy + download dropdown)"
```

---

### Task 5: Central Export Page

**Files:**
- Create: `src/app/(app)/export/page.tsx`
- Create: `src/components/export/export-page-view.tsx`
- Modify: `src/components/layout/sidebar.tsx` (add Export nav item)

- [ ] **Step 1: Create export page view (client component)**

```tsx
// src/components/export/export-page-view.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  FileDown,
  Package,
  Target,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import type { GtmContextPackage, ExportFormat } from "@/lib/context-export/types";
import { toJson, toMarkdown, toClipboardText } from "@/lib/context-export/formatters";

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPageView({
  fullContext,
}: {
  fullContext: GtmContextPackage;
}) {
  const [includeProduct, setIncludeProduct] = useState(true);
  const [includeIcps, setIncludeIcps] = useState(true);
  const [includeScoring, setIncludeScoring] = useState(true);
  const [format, setFormat] = useState<ExportFormat>("clipboard");
  const [copied, setCopied] = useState(false);

  const hasProduct = !!fullContext.product;
  const hasIcps = !!fullContext.icps && fullContext.icps.length > 0;
  const hasScoring = !!fullContext.scoring && fullContext.scoring.totalRuns > 0;

  // Build filtered context based on module toggles
  const filteredContext = useMemo<GtmContextPackage>(() => {
    const pkg: GtmContextPackage = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      workspace: fullContext.workspace,
    };
    if (includeProduct && fullContext.product) pkg.product = fullContext.product;
    if (includeIcps && fullContext.icps) pkg.icps = fullContext.icps;
    if (includeScoring && fullContext.scoring) pkg.scoring = fullContext.scoring;
    return pkg;
  }, [fullContext, includeProduct, includeIcps, includeScoring]);

  const formatted = useMemo(() => {
    switch (format) {
      case "json":
        return toJson(filteredContext);
      case "markdown":
        return toMarkdown(filteredContext);
      case "clipboard":
        return toClipboardText(filteredContext);
    }
  }, [filteredContext, format]);

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const companySlug = (fullContext.product?.companyName ?? fullContext.workspace.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const ext = format === "json" ? ".json" : ".md";
    const content = format === "json" ? toJson(filteredContext) : toMarkdown(filteredContext);
    downloadFile(content, `${companySlug}-gtm-context${ext}`);
  }

  const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
    { value: "clipboard", label: "Compact text" },
    { value: "markdown", label: "Markdown" },
    { value: "json", label: "JSON" },
  ];

  return (
    <div className="space-y-6">
      {/* Nudges */}
      {!hasProduct && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-muted-foreground">
            Add product context to enrich your export —{" "}
            <Link href="/settings/product" className="font-medium text-foreground hover:underline">
              set up product info
            </Link>
          </p>
        </div>
      )}
      {!hasIcps && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-muted-foreground">
            Create your first ICP to include it in exports —{" "}
            <Link href="/icps" className="font-medium text-foreground hover:underline">
              manage ICPs
            </Link>
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Module toggles */}
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeProduct}
              onChange={(e) => setIncludeProduct(e.target.checked)}
              disabled={!hasProduct}
              className="rounded"
            />
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            Product
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeIcps}
              onChange={(e) => setIncludeIcps(e.target.checked)}
              disabled={!hasIcps}
              className="rounded"
            />
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            ICPs
            {hasIcps && (
              <Badge variant="secondary" className="text-[10px]">
                {fullContext.icps!.length}
              </Badge>
            )}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeScoring}
              onChange={(e) => setIncludeScoring(e.target.checked)}
              disabled={!hasScoring}
              className="rounded"
            />
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            Scoring
          </label>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Format picker */}
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormat(opt.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                format === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy to clipboard"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>

      {/* Preview */}
      <Card>
        <CardContent className="p-0">
          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-muted-foreground">
            {formatted}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create server page**

```tsx
// src/app/(app)/export/page.tsx
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { buildFullContext } from "@/lib/context-export/builders";
import { ExportPageView } from "@/components/export/export-page-view";

export default async function ExportPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const fullContext = await buildFullContext(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GTM Context Export</h1>
        <p className="text-muted-foreground">
          Share your product and ICP context with partners, AI agents, or your team
        </p>
      </div>
      <ExportPageView fullContext={fullContext} />
    </div>
  );
}
```

- [ ] **Step 3: Add Export to sidebar**

In `src/components/layout/sidebar.tsx`, add `FileDown` to imports and insert the nav item between Score Leads and AI Settings:

```typescript
// Add to imports:
import { ..., FileDown, ... } from "lucide-react";

// Add to navItems array between "Score Leads" and "AI Settings":
{ href: "/export", label: "Export", icon: FileDown },
```

The resulting order:
```
{ href: "/scoring", label: "Score Leads", icon: FileSearch },
{ href: "/export", label: "Export", icon: FileDown },
{ href: "/settings/ai", label: "AI Settings", icon: Sparkles },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/export/page.tsx src/components/export/export-page-view.tsx src/components/layout/sidebar.tsx
git commit -m "feat: add central GTM Context Export page with module toggles and format picker"
```

---

### Task 6: Add contextual export buttons to existing pages

**Files:**
- Modify: `src/app/(app)/icps/page.tsx`
- Modify: `src/app/(app)/icps/[id]/page.tsx`
- Modify: `src/app/(app)/settings/product/page.tsx`

- [ ] **Step 1: ICPs list page — add "Copy all ICPs" button**

In `src/app/(app)/icps/page.tsx`:

Add imports:
```typescript
import { buildFullContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";
```

Add to the data loading (inside the `Promise.all`):
```typescript
const [icps, productCtx, wsShare, exportContext] = await Promise.all([
  getIcps(ctx.workspaceId),
  getProductContext(ctx.workspaceId),
  getWorkspaceShareInfo(ctx.workspaceId),
  buildFullContext(ctx.workspaceId, { product: true, icps: true, scoring: false }),
]);
```

Add `ContextExportButton` in the header buttons area, before the Import link:
```tsx
<ContextExportButton context={exportContext} label="Copy all ICPs" />
```

- [ ] **Step 2: ICP detail page — add "Copy ICP" button**

In `src/app/(app)/icps/[id]/page.tsx`:

Add imports:
```typescript
import { buildIcpContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";
```

Add context building after the existing queries:
```typescript
const exportContext = await buildIcpContext(ctx.workspaceId, id);
```

Add `ContextExportButton` in the header buttons area, before IcpShareDialog:
```tsx
<ContextExportButton context={exportContext} label="Copy ICP" />
```

- [ ] **Step 3: Product page — add "Copy product context" button**

In `src/app/(app)/settings/product/page.tsx`:

Add imports:
```typescript
import { buildProductContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";
```

Add context building:
```typescript
const [context, rejected, exportContext] = await Promise.all([
  getProductContext(ctx.workspaceId),
  getRejectedIcps(ctx.workspaceId),
  buildProductContext(ctx.workspaceId),
]);
```

Add `ContextExportButton` in the header area — add a flex wrapper around the heading:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">About your product</h1>
    <p className="text-muted-foreground">
      Help iseep understand what you sell so it can suggest better ICPs and segments
    </p>
  </div>
  {context && <ContextExportButton context={exportContext} label="Copy product context" />}
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/icps/page.tsx" "src/app/(app)/icps/[id]/page.tsx" "src/app/(app)/settings/product/page.tsx"
git commit -m "feat: add contextual export buttons to ICPs, ICP detail, and Product pages"
```

---

### Task 7: Final verification and deploy

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: ESLint check**

Run: `pnpm lint`
Expected: no new errors (pre-existing warnings are OK)

- [ ] **Step 3: Push to deploy**

```bash
git push origin main
```

Expected: Vercel auto-deploys

- [ ] **Step 4: Manual smoke test checklist**

After deploy, verify on iseep.io:
1. `/export` page loads with preview, toggles work, copy works, download works
2. "Export" appears in sidebar between "Score Leads" and "AI Settings"
3. `/icps` page shows "Copy all ICPs" button that copies context
4. `/icps/[id]` page shows "Copy ICP" button
5. `/settings/product` page shows "Copy product context" button (if product context exists)
6. Downloaded .md file is valid markdown
7. Downloaded .json file is valid JSON with `schemaVersion: 1`
