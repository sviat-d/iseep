# Draft System — Design Spec (Claude → iseep)

> **Goal:** Allow Claude (or any AI agent) to propose changes to iseep data through reviewable drafts. Human approves before anything is applied. "Claude proposes, human approves, iseep applies."

## 1. Problem

iseep can export GTM context to Claude, but there is no way for Claude to send structured suggestions back. Users must manually recreate Claude's recommendations as ICPs, product updates, or segments.

## 2. Solution

A draft/suggestion system with:
- **One generic `drafts` table** storing all proposed changes with typed JSONB payloads
- **Two input paths:** paste UI (copy Claude response → parse → preview → create drafts) and API endpoint (agents POST directly)
- **Inbox page** listing pending/approved/rejected drafts
- **Review page** with diff preview and approve/reject controls
- **Apply logic** that creates or updates real entities from approved drafts

## 3. Data Model

### `drafts` table

```sql
CREATE TABLE drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id),
  source          text NOT NULL,          -- "claude" | "manual" | "system"
  target_type     text NOT NULL,          -- "create_icp" | "update_product" | "update_icp" | "create_segment" | "create_note"
  target_id       uuid,                   -- null for create actions, entity id for updates
  payload         jsonb NOT NULL,          -- proposed data, shape depends on target_type
  summary         text NOT NULL,           -- human-readable: "Add ICP for Creator Economy"
  reasoning       text,                    -- why Claude suggests this
  status          text NOT NULL DEFAULT 'pending',  -- "pending" | "approved" | "rejected" | "applied"
  created_by      uuid REFERENCES users(id),
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at     timestamp with time zone,
  applied_at      timestamp with time zone
);
```

### New field on `workspaces`

```sql
ALTER TABLE workspaces ADD COLUMN api_token text UNIQUE;
```

Used for bearer auth on the API endpoint. One token per workspace. Generated from AI Settings page.

## 4. Supported Draft Types

### `create_icp`

Creates a new ICP with criteria and personas.

Payload shape:
```typescript
{
  name: string;
  description?: string;
  criteria: Array<{
    group: "firmographic" | "technographic" | "behavioral" | "compliance" | "keyword";
    category: string;
    value: string;
    intent: "qualify" | "risk" | "exclude";
    importance?: number;
  }>;
  personas: Array<{
    name: string;
    description?: string;
  }>;
}
```

Apply: inserts ICP (status: draft) + criteria + personas. Same logic as `confirmImportIcps`.

### `update_product`

Updates product context fields. Only non-null fields in payload overwrite current values.

Payload shape:
```typescript
{
  companyName?: string;
  website?: string;
  productDescription?: string;
  targetCustomers?: string;
  coreUseCases?: string[];
  keyValueProps?: string[];
  industriesFocus?: string[];
  geoFocus?: string[];
}
```

Apply: merge payload fields over current product context. Fields not in payload remain unchanged.

### `update_icp`

Modifies an existing ICP's criteria and/or personas. Requires `target_id` pointing to the ICP.

Payload shape:
```typescript
{
  name?: string;
  description?: string;
  addCriteria?: Array<{
    group: string;
    category: string;
    value: string;
    intent: "qualify" | "risk" | "exclude";
    importance?: number;
  }>;
  removeCriteriaIds?: string[];
  addPersonas?: Array<{
    name: string;
    description?: string;
  }>;
  removePersonaIds?: string[];
}
```

Apply: adds new criteria/personas, removes specified ones by ID. Bumps ICP version. Creates ICP snapshot for history.

### `create_segment`

Creates a new segment linked to an ICP.

Payload shape:
```typescript
{
  name: string;
  description?: string;
  icpId: string;
  logicJson?: object;
}
```

Apply: inserts segment record with status "draft".

### `create_note`

Attaches a free-form note to an entity.

Payload shape:
```typescript
{
  content: string;
  targetType?: "icp" | "company" | "deal";
  targetId?: string;
}
```

Apply: stores note. V1 stores as a simple record. Can be extended to attach to specific entities.

## 5. Payload Validation

Each `target_type` has a Zod schema in `src/lib/drafts/types.ts`. The parser validates payload against the correct schema based on `target_type`. Invalid payloads are rejected with field-level error messages.

Common validation:
- `target_type` must be one of the 5 supported values
- `summary` is required and non-empty
- `payload` must pass the type-specific Zod schema
- For update types: `target_id` is required

## 6. Structured Input Format

All input (paste and API) uses the same JSON structure:

```json
{
  "drafts": [
    {
      "target_type": "create_icp",
      "summary": "ICP for Creator Economy payout platforms",
      "reasoning": "Based on your product context, creator economy companies need mass payouts...",
      "payload": {
        "name": "Creator Economy",
        "description": "Companies in creator economy needing mass payouts to creators",
        "criteria": [
          { "group": "firmographic", "category": "industry", "value": "Creator Economy", "intent": "qualify", "importance": 9 }
        ],
        "personas": [
          { "name": "Head of Finance", "description": "Manages creator payouts" }
        ]
      }
    },
    {
      "target_type": "update_product",
      "summary": "Add creator economy to industries focus",
      "payload": {
        "industriesFocus": ["FinTech", "iGaming", "E-commerce", "Creator Economy"]
      }
    }
  ]
}
```

Always an array — Claude can propose multiple changes at once.

Parser accepts this JSON, validates each draft, returns success with created IDs or error with details.

## 7. API Endpoint

### `POST /api/drafts`

```
Headers:
  Authorization: Bearer {workspace_api_token}
  Content-Type: application/json

Body: { "drafts": [...] }

Response 201:
  { "created": 2, "ids": ["uuid1", "uuid2"] }

Response 401:
  { "error": "Invalid or missing API token" }

Response 400:
  { "error": "Validation failed", "details": [{ "index": 0, "issues": [...] }] }
```

Auth: looks up `workspaces.api_token` matching the bearer token. Scopes all created drafts to that workspace.

No rate limiting in v1. Token is secret and workspace-scoped.

## 8. Paste UI — `/drafts/import`

3-step flow (same pattern as ICP Import wizard):

**Step 1: Paste**
- Large textarea with JSON placeholder showing expected format
- "Parse" button

**Step 2: Preview**
- List of parsed draft cards, each showing: target_type badge, summary, reasoning (if present)
- Validation errors shown inline per draft
- "Create N suggestions" button

**Step 3: Confirmation**
- Success message with count
- Link to `/drafts` inbox

## 9. Drafts Inbox — `/drafts`

Sidebar item: "Suggestions" with `Inbox` lucide icon, between "Export" and "AI Settings".

Page layout:
- Header: "Suggestions" + subtitle
- Filter tabs: Pending | Approved | Rejected | All
- List of draft cards, each showing:
  - Target type badge (color-coded: ICP=blue, Product=green, Segment=purple, Note=gray)
  - Summary text
  - Source badge (Claude / Manual)
  - Relative timestamp
  - "Review →" link
- Empty state: "No suggestions yet. Copy your GTM context to Claude and ask for improvements."

## 10. Review Page — `/drafts/[id]`

### Layout

- Back link to `/drafts`
- Header: summary + status badge + source badge + timestamp
- Reasoning card (if present): "Why this was suggested" with Claude's explanation

### Diff Section (varies by target_type)

**`create_icp`:** Preview of proposed ICP — name, description, criteria table (grouped by intent), personas list. No "current" column, only "proposed". Similar layout to cluster-review page.

**`update_product`:** Field-by-field diff. Each changed field shows:
- Field name
- Current value (from DB)
- Proposed value (from payload)
- Unchanged fields are not shown

**`update_icp`:** Two sections:
- "Add" section: new criteria/personas in green-tinted rows
- "Remove" section: criteria/personas to remove in red-tinted rows
- If name/description changed: field-by-field diff

**`create_segment`:** Preview card with name, description, linked ICP name.

**`create_note`:** Content text with target entity reference if present.

### Actions

- **"Approve & Apply"** (primary button) — applies the draft, creates/updates entity, sets status to `applied`, sets `applied_at`
- **"Reject"** (destructive outline button) — sets status to `rejected`, sets `reviewed_at`
- **"Back to suggestions"** (ghost link)

No inline editing in v1. User can reject and recreate manually, or approve as-is.

## 11. Apply Logic

Server action `applyDraft(draftId)`:

1. Load draft, verify status is `pending`
2. Load current entity data (for updates)
3. Execute based on `target_type`:

| Type | Action | Reuses |
|------|--------|--------|
| `create_icp` | Insert ICP + criteria + personas (status: draft) | `confirmImportIcps` pattern |
| `update_product` | Merge payload over current product_context | `saveProductContext` pattern |
| `update_icp` | Add/remove criteria/personas, bump version, create snapshot | Existing ICP update patterns |
| `create_segment` | Insert segment (status: draft) | Existing segment create |
| `create_note` | Insert note record | Simple insert |

4. Update draft: `status → "applied"`, `applied_at → now()`
5. `revalidatePath` for affected pages

## 12. API Token Management

Added to AI Settings page (`/settings/ai`):

New card "API Access" below existing cards:
- If no token: "Generate API token" button
- If token exists: masked token display + "Copy" button + "Regenerate" button
- Endpoint URL shown: `POST https://iseep.io/api/drafts`
- Brief usage example

Server action: `generateApiToken()` — creates random 32-byte hex token, saves to `workspaces.api_token`.

## 13. File Structure

### New files

```
src/lib/drafts/
  types.ts                                — payload Zod schemas per target_type, DraftInput type
  parse.ts                                — parseDraftsInput(json) → validated drafts or errors
  apply.ts                                — applyDraft(draftId) → execute and update status

src/actions/drafts.ts                     — createDrafts, approveDraft, rejectDraft, generateApiToken

src/app/api/drafts/route.ts              — POST handler with bearer auth

src/app/(app)/drafts/
  page.tsx                                — inbox server page
  import/page.tsx                         — paste import server page
  [id]/page.tsx                           — review detail server page

src/components/drafts/
  drafts-inbox.tsx                        — inbox list with filter tabs (client)
  draft-import-form.tsx                   — paste textarea + parse + preview (client)
  draft-review-view.tsx                   — review with diff + approve/reject (client)
  draft-diff.tsx                          — field-by-field current vs proposed renderer
```

### Modified files

```
src/db/schema.ts                          — add drafts table + api_token on workspaces
src/components/layout/sidebar.tsx         — add "Suggestions" nav item
src/app/(app)/settings/ai/page.tsx        — pass api_token to form
src/components/settings/ai-settings-form.tsx — add API token card
```

## 14. Security

- All draft operations require authenticated workspace context
- API endpoint authenticates via bearer token scoped to workspace
- Drafts are workspace-isolated (no cross-workspace access)
- Apply action verifies draft belongs to user's workspace
- `target_id` for updates is validated against workspace ownership
- API token stored as plain text in v1 (same as AI keys — encrypt in production)
- No sensitive data in draft payloads (same principle as GTM context export)

## 15. Audit Trail

The `drafts` table itself is the audit trail:
- `source`: who proposed (claude/manual/system)
- `created_by`: which user imported the suggestion
- `status` transitions: pending → applied or rejected
- `created_at`, `reviewed_at`, `applied_at` timestamps
- `payload` preserved even after apply — can always see what was proposed
- Rejected drafts remain in inbox as history

## 16. Future Extensibility

- **Inline editing** before approve: add `edited_payload` field, apply edited version instead of raw
- **New target types:** add Zod schema + apply handler, everything else works
- **MCP server tool:** wrap API endpoint as MCP tool for Claude Desktop
- **Batch approve:** approve multiple drafts at once from inbox
- **Undo applied:** mark applied draft as "reverted", reverse the entity changes
- **Notifications:** notify workspace members when new suggestions arrive
