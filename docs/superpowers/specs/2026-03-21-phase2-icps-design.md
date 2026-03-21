# Phase 2 Design: ICPs + Personas + Criteria + Versioning

## Overview

Full Phase 2 for iseep — ICP management with structured criteria (fit factors + exclusions), personas, signals, ICP versioning, and a decision-support dashboard. Uses Server Actions + RSC pattern consistent with existing architecture.

## Product Model

### Three distinct layers for ICP definition

| Concept | Table | What it is | Temporal? |
|---------|-------|------------|-----------|
| **Fit factors** | `criteria` (intent=qualify) | Static company properties that attract — "industry = FinTech" | No |
| **Exclusions** | `criteria` (intent=exclude) | Static company properties that disqualify — "AML-restricted" | No |
| **Signals** | `signals` (separate table) | Observed events indicating match/mismatch — "hired crypto compliance team" | Yes |

Fit factors and exclusions share the same shape (group, category, operator, value) because they're both rules about company properties. The difference is intent, not structure.

Signals are fundamentally different — temporal, event-like, with polarity and strength. They stay separate.

### Criteria groups

The `group` enum organizes criteria into domains, preventing the "junk drawer" problem:

- **firmographic** — industry, region, company size, revenue, business model
- **technographic** — tech stack, platforms (Shopify, WooCommerce), integrations
- **behavioral** — web traffic, growth patterns, hiring trends
- **compliance** — regulatory status, certifications, restrictions
- **keyword** — search terms, tags, labels for matching

UI renders collapsible sections per group. Category is free text within its group, with UI suggestions per group to prevent inconsistency (region vs geo vs geography).

### Exclusion model

Exclusions are criteria with `intent = "exclude"`. They:
- Are visually separated in UI (own section, warning-colored badges)
- Are always hard rules (weight is ignored for exclusions)
- Are queryable independently: "show all exclusions across all ICPs"

### ICP versioning

`icp_snapshots` table captures full ICP state at a point in time:
- Defined TypeScript shape with `schemaVersion` for forward compatibility
- Embedded stats (deal counts, win rate at snapshot time)
- Auto-generated `changeSummary` for scannable history
- User-provided `note` explaining why the version was saved
- MVP: manual snapshots only. User clicks "Save Version" on ICP detail.

Snapshot data shape:
```typescript
type IcpSnapshotData = {
  schemaVersion: 1;
  icp: { name: string; description: string | null; status: string };
  criteria: Array<{
    group: string; category: string; operator: string | null;
    value: string; intent: string; weight: number | null; note: string | null;
  }>;
  personas: Array<{ name: string; description: string | null }>;
  signals: Array<{
    type: string; label: string; description: string | null; strength: number | null;
  }>;
  stats: {
    qualifyCount: number; excludeCount: number; personaCount: number;
    signalCount: number; dealCount: number; wonCount: number; lostCount: number;
  };
};
```

### Confidence / evidence

No schema change. Presentation-layer rule:
- Every computed rate shows sample size: "75% (3/4)" not "75%"
- Visual treatment: < 5 deals = muted, 5-19 = normal, 20+ = bold
- Thresholds are constants in code

## Architecture Decisions

- **Server Actions for mutations only** — consistent with auth.ts pattern
- **Query functions in `src/lib/queries/`** — plain async functions called from server components
- **Client Components for interactivity** — tabs, toggle view, modals, forms
- **revalidatePath()** for cache invalidation after mutations
- **localStorage** for toggle view preference — read via `useEffect`, defaults to table on server
- **React Hook Form + Zod v4** for validation
- **TanStack Table** for table views, using shadcn `<Table>` as rendering shell

## Database Schema (changed/new tables only)

### `icps` — added `version`

```typescript
export const icps = pgTable("icps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["draft", "active", "archived"] }).default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  parentIcpId: uuid("parent_icp_id"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### `personas` — unchanged

### `criteria` — replaces `dimensions`

```typescript
export const criteria = pgTable("criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  icpId: uuid("icp_id").references(() => icps.id),
  personaId: uuid("persona_id").references(() => personas.id),
  group: text("group", {
    enum: ["firmographic", "technographic", "behavioral", "compliance", "keyword"],
  }).notNull(),
  category: text("category").notNull(),
  operator: text("operator", {
    enum: ["equals", "contains", "gt", "lt", "in", "not_in"],
  }),
  value: text("value").notNull(),
  intent: text("intent", { enum: ["qualify", "exclude"] }).default("qualify").notNull(),
  weight: integer("weight"), // 1-10, only meaningful for qualify intent
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### `segments` — added `priorityScore`

```typescript
export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  icpId: uuid("icp_id").references(() => icps.id).notNull(),
  personaId: uuid("persona_id").references(() => personas.id),
  name: text("name").notNull(),
  description: text("description"),
  logicJson: jsonb("logic_json").default({}).notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] }).default("draft").notNull(),
  priorityScore: integer("priority_score").default(5).notNull(), // 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### `productRequests` — added `status` + `source`

```typescript
export const productRequests = pgTable("product_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  icpId: uuid("icp_id").references(() => icps.id),
  personaId: uuid("persona_id").references(() => personas.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  type: text("type", {
    enum: ["feature_request", "adjacent_product", "use_case", "integration_request"],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["open", "validated", "planned", "rejected"],
  }).default("open").notNull(),
  source: text("source", {
    enum: ["deal", "meeting_note", "manual"],
  }).default("manual").notNull(),
  frequencyScore: integer("frequency_score"), // 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### `icpSnapshots` — new table

```typescript
export const icpSnapshots = pgTable(
  "icp_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
    icpId: uuid("icp_id").references(() => icps.id).notNull(),
    version: integer("version").notNull(),
    snapshotData: jsonb("snapshot_data").notNull(), // IcpSnapshotData shape
    changeSummary: text("change_summary"), // auto: "+2 criteria, -1 exclusion"
    note: text("note"), // user: "Added compliance exclusions after Q1 review"
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("icp_snapshots_icp_version").on(table.icpId, table.version)]
);
```

### Unchanged tables

workspaces, users, memberships, signals, companies, contacts, deals, dealReasons, meetingNotes — no schema changes.

## Query Functions

### `src/lib/queries/icps.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getIcps` | `(workspaceId: string)` | List ICPs with qualify/exclude/persona counts |
| `getIcp` | `(id: string, workspaceId: string)` | ICP with criteria, personas, signals, linked segments |
| `getIcpSnapshots` | `(icpId: string, workspaceId: string)` | Version history for an ICP |

### `src/lib/queries/personas.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPersonas` | `(icpId: string, workspaceId: string)` | List personas for an ICP |
| `getPersona` | `(id: string, workspaceId: string)` | Single persona with linked criteria |

### `src/lib/queries/dashboard.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getDashboardStats` | `(workspaceId: string)` | Active ICPs, segments, open deals, win rate with evidence |
| `getIcpHealth` | `(workspaceId: string)` | Per-ICP: criteria/exclusion/persona counts + deal stats |
| `getRecentActivity` | `(workspaceId: string, limit?: number)` | Last N changes across ICPs, criteria |

## Server Actions (mutations only)

### `src/actions/icps.ts`

| Action | Returns | Description |
|--------|---------|-------------|
| `createIcp(formData)` | redirect | Create ICP, set createdBy + workspaceId server-side |
| `updateIcp(id, formData)` | `ActionResult` | Update fields, set updatedAt |
| `deleteIcp(id)` | redirect | Manual cascade: criteria → personas → ICP, redirect /icps |
| `saveIcpSnapshot(icpId, note)` | `ActionResult` | Capture full state, auto-generate changeSummary, increment version |

### `src/actions/personas.ts`

| Action | Returns | Description |
|--------|---------|-------------|
| `createPersona(formData)` | `ActionResult` | Create, workspaceId injected server-side |
| `updatePersona(id, formData)` | `ActionResult` | Update, set updatedAt |
| `deletePersona(id)` | `ActionResult` | Delete persona + persona-specific criteria |

### `src/actions/criteria.ts`

| Action | Returns | Description |
|--------|---------|-------------|
| `createCriterion(formData)` | `ActionResult` | Create, workspaceId injected server-side |
| `updateCriterion(id, formData)` | `ActionResult` | Update, set updatedAt |
| `deleteCriterion(id)` | `ActionResult` | Delete |

### ActionResult + Authorization

```typescript
type ActionResult = { error?: string; success?: boolean }
```

Every action: get auth user → resolve workspaceId from membership → verify resource belongs to workspace. `workspaceId` never accepted from client.

## Validators (`src/lib/validators.ts`)

```typescript
icpSchema: {
  name: z.string().min(1).max(100)
  description: z.string().optional()
  status: z.enum(["draft", "active", "archived"])
  parentIcpId: z.string().uuid().optional()
}

personaSchema: {
  name: z.string().min(1)
  description: z.string().optional()
  icpId: z.string().uuid()
}

criterionSchema: {
  group: z.enum(["firmographic", "technographic", "behavioral", "compliance", "keyword"])
  category: z.string().min(1)
  operator: z.enum(["equals", "contains", "gt", "lt", "in", "not_in"]).optional()
  value: z.string().min(1)
  intent: z.enum(["qualify", "exclude"])
  weight: z.number().int().min(1).max(10).optional()
  note: z.string().optional()
  icpId: z.string().uuid().optional()
  personaId: z.string().uuid().optional()
}
```

## Pages

### Dashboard

**Top row (4 stat cards):**
- Active ICPs (count)
- Active Segments (count)
- Open Deals (count)
- Win Rate with evidence — "62% (18/29)" or "—" if no closed deals

**Middle: ICP Health Overview**
Compact table of active ICPs showing per-ICP:
- Name + status badge + version
- Criteria count | Exclusion count | Persona count
- Deals: X open / Y won / Z lost
- Win rate with sample size (muted if < 5 deals)

**Bottom: Recent Activity + Quick Actions**

### `/icps` — ICP List

- Toggle table/cards view (localStorage, defaults to table)
- **Table:** Name, Status (badge), Version, Qualify count, Exclude count, Personas, Created. Sortable. Status filter.
- **Cards:** grid, name, truncated description, status badge, counters
- "Create ICP" button → `/icps/new`

### `/icps/new` — Create ICP

- Fields: Name, Description, Status (draft/active), Parent ICP (select, optional)
- React Hook Form + Zod. Submit → createIcp() → redirect to `/icps/[id]`

### `/icps/[id]` — ICP Detail

**Header:** name, description, status badge, version ("v3"), Edit | Save Version | Delete buttons

**Tab 1: Profile** — Criteria grouped by `group` in collapsible sections:
```
▼ Firmographic (3)
  ✓ industry = Financial Services          weight: 9
  ✓ region in [EU, UK, US]                 weight: 7

▼ Exclusions (2)                           ← warning section
  ✗ compliance = aml_restricted
  ✗ region in [sanctioned_countries]
```
Each section has "+ Add" with group pre-selected. Exclusions visually distinct.

**Tab 2: Personas** — persona cards, CRUD via modals

**Tab 3: Signals** — signal list (positive/negative/neutral), CRUD via modals

**Tab 4: Segments** — read-only list of linked segments with priority score, deal count, win rate

**Tab 5: Performance** — deal stats, top loss reasons, top product requests (only shown when deals exist)

**Tab 6: History** — version history list with changeSummary, note, timestamp

### `/personas/[id]` — Persona Detail

Name, description, linked ICP, persona-specific criteria. Simple, extensible.

## New Components

### shadcn/ui to add

dialog, tabs, select, textarea, table

### Feature components

```
src/components/
├── icps/
│   ├── icp-list-view.tsx          # toggle table/cards
│   ├── icp-table.tsx              # TanStack Table
│   ├── icp-cards.tsx              # cards grid
│   ├── icp-form.tsx               # create/edit form
│   ├── icp-tabs.tsx               # tabs container
│   ├── icp-delete-dialog.tsx      # confirm delete
│   └── icp-version-history.tsx    # snapshot list
├── criteria/
│   ├── criteria-grouped-list.tsx  # grouped by group enum, collapsible sections
│   └── criterion-form-dialog.tsx  # create/edit modal
├── personas/
│   ├── persona-list.tsx           # persona cards
│   ├── persona-form-dialog.tsx    # create/edit modal
│   └── persona-card.tsx           # individual card
└── signals/
    ├── signal-list.tsx            # signal list for tab
    └── signal-form-dialog.tsx     # create/edit modal
```

## File Structure Summary

```
src/
├── actions/
│   ├── auth.ts            # existing
│   ├── icps.ts            # new — mutations + saveSnapshot
│   ├── personas.ts        # new — mutations
│   └── criteria.ts        # new — mutations
├── lib/
│   ├── queries/
│   │   ├── icps.ts        # new — reads + snapshots
│   │   ├── personas.ts    # new — reads
│   │   └── dashboard.ts   # new — stats + health
│   └── validators.ts      # extend — icp/persona/criterion schemas
├── app/(app)/
│   ├── dashboard/page.tsx     # update — real data + ICP health
│   ├── icps/
│   │   ├── page.tsx           # rewrite — list with toggle
│   │   ├── new/page.tsx       # create — new route
│   │   └── [id]/page.tsx      # rewrite — detail with 6 tabs
│   └── personas/
│       └── [id]/page.tsx      # rewrite — detail page
└── components/
    ├── icps/              # 7 components
    ├── criteria/          # 2 components
    ├── personas/          # 3 components
    └── signals/           # 2 components
```

## Migration from current schema

One Drizzle migration, no data loss:

1. Rename `dimensions` → `criteria`
2. Add `group` column (default "firmographic" for existing data)
3. Add `intent` column (default "qualify"), migrate `is_negative=true` → `intent="exclude"`
4. Drop `type` and `is_negative` columns
5. Constrain `operator` to enum
6. Add `version` to `icps` (default 1)
7. Add `priority_score` to `segments` (default 5)
8. Add `status` + `source` to `product_requests`
9. Create `icp_snapshots` table
10. Update seed script to use new schema
