# Phase 3 Design: Segment Builder

## Overview

Visual segment builder with AND/OR/NOT logic, recursive condition groups, two display modes (read-only + edit), and segment list grouped by ICP.

## Product Model

A **segment** is a subset of an ICP defined by combining criteria with AND/OR/NOT logic. Segments make ICPs actionable — they represent targetable audiences.

Each segment belongs to one ICP and contains a `logicJson` field that stores the condition tree.

## logicJson Structure

```typescript
type ConditionNode =
  | {
      type: "criterion";
      criterionId: string;
      group: string;
      category: string;
      operator: string;
      value: string;
      intent: string;
    }
  | {
      type: "group";
      operator: "AND" | "OR" | "NOT";
      conditions: ConditionNode[];
    };
```

- Root is always a `type: "group"` node (default: AND)
- NOT groups contain exactly one child
- Leaf nodes reference criteria by `criterionId` + snapshot of fields
- Empty segment: `{ type: "group", operator: "AND", conditions: [] }`

## Criteria Linkage

- Select existing criterion from the ICP → copies `criterionId` + fields
- Create new criterion from within builder → calls `createCriterion` action, criterion saved to ICP, `criterionId` returned
- Snapshot fields (group, category, operator, value, intent) stored in logicJson for read-only rendering without extra queries

## Pages

### `/segments` — Segment List

- Server component, loads all segments grouped by ICP
- Collapsible sections per ICP (ICP name as header, segment count)
- Each segment row: name, status badge, priority score (1-10), conditions count
- Status filter (All / Draft / Active / Archived)
- "Create Segment" button → `/segments/new`
- Empty state: "No segments yet. Create your first segment from an ICP."

### `/segments/new` — Create Segment

- Server component loads ICPs for select
- Supports `?icpId=xxx` query param to pre-select ICP
- Form: ICP (select, required), Name, Description, Status, Priority Score (1-10)
- Submit → `createSegment` action → redirect to `/segments/[id]`

### `/segments/[id]` — Segment Detail

**Read-only mode (default):**
- Header: name, status badge, priority score, ICP link, Edit / Delete buttons
- Conditions rendered as human-readable indented text:
  ```
  ✅ Industry = FinTech
  AND ✅ Region = EU, Asia
  AND NOT (❌ Country = sanctioned)
  ```
- Nested groups shown with indentation + operator labels
- Empty conditions: "No conditions defined yet. Click Edit to start building."

**Edit mode (toggled by Edit button):**
- Same header but with Save / Cancel buttons
- Recursive `<ConditionGroup>` component renders the condition tree
- Each group: border box with AND/OR toggle in header
- Group actions: "+ Condition", "+ Group", "+ NOT group"
- Each condition: displays property = value with intent icon, Edit / Delete buttons
- Adding condition opens picker dialog:
  - Select from existing ICP criteria (list with intent icons)
  - Or "Create new rule" → opens CriterionFormDialog (reused from Phase 2)
- Save button calls `updateSegment` with serialized logicJson
- Cancel reverts to last saved state

## Data Layer

### Queries (`src/lib/queries/segments.ts`)

- `getSegments(workspaceId)` — all segments with ICP name, grouped
- `getSegment(id, workspaceId)` — segment + ICP info
- `getSegmentsForIcp(icpId, workspaceId)` — segments for one ICP

### Actions (`src/actions/segments.ts`)

- `createSegment(formData)` — create, redirect to detail
- `updateSegment(id, formData)` — update all fields including logicJson
- `deleteSegment(id)` — null out FK refs in deals/productRequests, delete segment

### Validators

```typescript
segmentSchema: {
  name: string (1-100, required)
  description: string (optional)
  icpId: uuid (required)
  status: enum [draft, active, archived]
  priorityScore: coerce number 1-10
  logicJson: any (validated as ConditionNode at application level)
}
```

## Components

```
src/components/segments/
├── segment-list-grouped.tsx      — grouped by ICP, collapsible
├── segment-form.tsx              — create form (name, ICP, status, priority)
├── segment-read-view.tsx         — human-readable condition display
├── segment-builder.tsx           — edit mode wrapper (state + save/cancel)
├── condition-group.tsx           — recursive AND/OR/NOT group
├── condition-row.tsx             — single criterion display with edit/delete
├── condition-picker-dialog.tsx   — pick from ICP criteria or create new
├── segment-delete-dialog.tsx     — confirm delete
└── segment-edit-dialog.tsx       — edit name/description/status/priority
```

## Builder State Helpers (`src/lib/segment-helpers.ts`)

Pure functions for immutable updates on ConditionNode tree:

```typescript
addCondition(tree, path, node) → tree
removeCondition(tree, path) → tree
updateCondition(tree, path, node) → tree
addGroup(tree, path, operator) → tree
toggleGroupOperator(tree, path) → tree
countConditions(tree) → number
```

Path is an array of indices: `[0, 2, 1]` means root.conditions[0].conditions[2].conditions[1].

## Architecture Decisions

- Reuse `CriterionFormDialog` from Phase 2 for creating new criteria from builder
- logicJson stored as JSONB — no separate condition tables
- Builder state managed with useState + helper functions (Approach A from brainstorming)
- Condition auto-set: `contains` for text properties, `equals` for others (same as Phase 2)
- No drag-and-drop (future enhancement)

## Dashboard / ICP Detail Updates

- ICP detail "Segments" tab: links now go to `/segments/[id]`
- Add "Create Segment" link in Segments tab → `/segments/new?icpId=[id]`
- Dashboard "Active Segments" stat already works from Phase 2 queries
