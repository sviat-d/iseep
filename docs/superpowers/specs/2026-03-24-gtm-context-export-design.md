# GTM Context Export — Design Spec

> **Goal:** Make iseep the source of truth for GTM context — exportable for AI agents, partners, investors, team members, and any external consumer.

## 1. Problem

iseep holds structured product positioning, ICPs, and scoring data, but there is no way to export this context in a reusable format. Users manually copy-paste fragments when they need to share with partners or feed context to AI tools.

## 2. Solution

A unified context export system with:
- **One data structure** (`GtmContextPackage`) built by reusable server-side builders
- **Three output formats** (JSON, Markdown, compact text) rendered by pure formatters
- **Central export page** (`/export`) with module selection, format picker, preview, copy, and download
- **Contextual export buttons** on Product, ICP list, and ICP detail pages for quick one-click copy

## 3. Data Model

### `GtmContextPackage`

```typescript
type GtmContextPackage = {
  schemaVersion: 1;
  exportedAt: string; // ISO 8601

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
```

No sensitive data is included: no deal values, client names, raw leads, or internal notes.

`schemaVersion: 1` enables future consumers to check compatibility.

## 4. Context Builders

Location: `src/lib/context-export/builders.ts`

### `buildFullContext(workspaceId, modules?)`

Assembles the complete `GtmContextPackage`. The optional `modules` parameter controls which sections to include:

```typescript
type ExportModules = {
  product?: boolean;  // default: true
  icps?: boolean;     // default: true
  scoring?: boolean;  // default: true
};
```

Reuses existing queries:
- `getProductContext(workspaceId)` for product section
- `getIcps(workspaceId)` + criteria/personas queries for ICPs section — **only active ICPs** are included (draft/archived excluded)
- Scoring section: first calls `getScoredUploads(workspaceId)` to get uploads sorted by date, picks the latest, then calls `getScoredLeadStats(latestUploadId, workspaceId)` for the breakdown. The DB field `none` is mapped to `unmatched` in the output. `totalLeads` uses `scored_uploads.totalRows` (CSV row count).

### `buildProductContext(workspaceId)`

Returns `GtmContextPackage` with only the product module populated. Convenience wrapper around `buildFullContext(id, { product: true, icps: false, scoring: false })`.

### `buildIcpContext(workspaceId, icpId)`

Returns `GtmContextPackage` with product context + a single ICP (regardless of status — user explicitly chose to export this ICP). Loads product for surrounding context, then one ICP with its criteria and personas.

## 5. Formatters

Location: `src/lib/context-export/formatters.ts`

Three pure functions. Input: `GtmContextPackage`. Output: `string`.

### `toJson(pkg)`

Pretty-printed JSON (`JSON.stringify(pkg, null, 2)`). Used by AI agents, MCP servers, API consumers.

### `toMarkdown(pkg)`

Human-readable document:

```markdown
# {Company Name} — GTM Context

## Product
{productDescription}

**Target customers:** {targetCustomers}
**Industries:** {industriesFocus, joined}
**Regions:** {geoFocus, joined}

### Use Cases
- {useCase1}
- {useCase2}

### Value Propositions
- {valueProp1}

---

## ICP: {name}
{description}

**Status:** {status} | **Version:** {version}

### Qualifying Criteria
| Category | Value | Weight |
|----------|-------|--------|
| {category} | {value} | {weight}/10 |

### Risk Signals
- {category}: {value}

### Exclusions
- {category}: {value}

### Personas
- **{title}** — {description}

---

## Scoring Summary
Latest run: {fileName} ({totalLeads} leads, {scoredAt})
- High fit: {high}
- Borderline: {medium + low + risk}
- Blocked: {blocked}
- Unmatched: {unmatched}
```

### `toClipboardText(pkg)`

Compact version of markdown without tables or heavy formatting. Optimized for AI context windows — maximum information density, minimum visual noise.

Example output:
```
COMPANY: INXY Payments (inxy.io)
Multi-currency crypto payment gateway for B2B cross-border payouts.
Target: B2B companies needing compliant, low-fee cross-border payments at scale.
Industries: FinTech, iGaming, E-commerce, AdTech
Regions: Western Europe, North America, MENA

Use cases: High-volume cross-border payouts, Recurring billing, Stablecoin settlement
Value props: Low fees, Fast settlement, Multi-currency support

---
ICP: Affiliate Networks [active, v1]
Companies running affiliate/publisher payout programs at scale.
Criteria (qualify): industry=Affiliate Marketing (9), region=EU, US (6), company_size=50-500 (4)
Criteria (exclude): business_type=Crypto exchange
Personas: Head of Finance, COO/Operations Lead

---
SCORING: leads-websummit.csv (450 leads, 2026-03-22)
High: 45 | Borderline: 120 | Blocked: 30 | Unmatched: 255
```

### Formatter rules for empty data

All formatters **omit sections entirely** when the underlying array is empty or the module is undefined. For example: if `coreUseCases` is `[]`, the "Use Cases" section is not rendered. If `scoring` is undefined, no scoring section appears. No placeholders or "N/A" blocks.

### Criteria grouping in formatters

Both `toMarkdown` and `toClipboardText` must group criteria by intent: "qualify" criteria go into the Qualifying section (table in markdown, inline in clipboard), "risk" criteria into Risk Signals, "exclude" criteria into Exclusions. The `intent` field on each criterion in `GtmContextPackage` drives this grouping.

## 6. Central Export Page

### Route

`/export` — new sidebar item "Export" with `FileDown` lucide icon, positioned after "Score Leads" and before "AI Settings".

### Page Structure

**Server component:** `src/app/(app)/export/page.tsx`
- Loads full context via `buildFullContext(workspaceId)`
- Passes to client view

**Client component:** `src/components/export/export-page-view.tsx`

Layout:
- **Header:** "GTM Context Export" + "Share your product and ICP context with partners, AI agents, or your team"
- **Controls bar:**
  - Module checkboxes: Product context, ICPs, Scoring summary (all checked by default)
  - Format picker: Markdown / JSON / Compact text (radio buttons)
- **Preview card:** Live preview of the export content in selected format, scrollable
- **Action buttons:**
  - "Copy to clipboard" (primary button)
  - "Download" (secondary button, downloads as .md or .json based on format)

### States

- **No product context:** Nudge banner linking to `/settings/product`
- **No ICPs:** Nudge banner linking to `/icps`
- **Preview updates** instantly when toggling modules or changing format

## 7. Contextual Export Buttons

### Component

`src/components/shared/context-export-button.tsx` — reusable client component.

**Props:**
```typescript
{
  context: GtmContextPackage;
  label?: string; // defaults to "Copy context"
}
```

**Behavior:**
- Default click: copy `toClipboardText(context)` to clipboard, show toast "Copied"
- Dropdown chevron reveals: "Download as Markdown", "Download as JSON"

### Placement

1. **Product page** (`/settings/product`) — header area. Label: "Copy product context". Context: product module only.

2. **ICP detail page** (`/icps/[id]`) — header next to Share/Edit. Label: "Copy ICP". Context: product + single ICP.

3. **ICPs list page** (`/icps`) — header next to Import/Create. Label: "Copy all ICPs". Context: product + all active ICPs.

Context is built server-side in each page.tsx and passed as serialized prop. No additional requests on click.

## 8. File Structure

### New Files

```
src/lib/context-export/
  types.ts              — GtmContextPackage, ExportModules, ExportFormat ("json" | "markdown" | "clipboard") types
  builders.ts           — buildFullContext(), buildProductContext(), buildIcpContext()
  formatters.ts         — toJson(), toMarkdown(), toClipboardText()

src/components/export/
  export-page-view.tsx  — central export page (client component)

src/components/shared/
  context-export-button.tsx  — reusable copy + download dropdown

src/app/(app)/export/
  page.tsx              — server page
```

### Modified Files

```
src/components/layout/sidebar.tsx           — add Export nav item
src/app/(app)/settings/product/page.tsx     — add ContextExportButton
src/app/(app)/icps/[id]/page.tsx            — add ContextExportButton
src/app/(app)/icps/page.tsx                 — add ContextExportButton
```

## 9. No New Database Tables

This feature is read-only. All data comes from existing tables via existing query functions. No migrations needed.

## 10. Security

- All builders require authenticated workspace context (`getAuthContext()`)
- Export only includes data from the user's workspace
- No sensitive data in exports (no deal values, client names, raw leads)
- Clipboard and download happen client-side after server-side data fetch

## 11. Future Extensibility

- **API endpoint:** Thin wrapper over `buildFullContext()` + `toJson()` behind auth token
- **MCP server tool:** Same builders power `get_gtm_context` tool
- **Draft write-back (Sub-project B):** Claude returns structured changes referencing this schema, iseep creates reviewable drafts
- **New modules:** Add `deals`, `insights`, `segments` modules to `ExportModules` without changing formatters (they skip undefined sections)
