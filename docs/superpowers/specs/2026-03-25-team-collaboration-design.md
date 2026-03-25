# Team Collaboration — Design Spec

> **Goal:** Enable team collaboration in iseep workspaces — invite members via email, define Owner/Member roles, and show activity feed on dashboard.

## 1. Problem

Workspaces are single-user in practice. The `memberships` table supports multiple users but there is no invite flow, no permission checks, and no visibility into team activity. Users cannot collaborate on ICPs, scoring, or draft review.

## 2. Solution

Two connected features:

1. **Team Management** — email invites, Owner/Member roles, team settings page
2. **Activity Feed** — log key actions, show on dashboard as "Recent Activity" widget

## 3. Data Model

### New table: `invites`

```typescript
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["member"] }).default("member").notNull(),
  invitedBy: uuid("invited_by").references(() => users.id).notNull(),
  token: text("token").unique().notNull(),
  status: text("status", { enum: ["pending", "accepted", "expired"] }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});
```

Invite tokens are 32-byte random hex strings (same pattern as `workspaces.apiToken`).

### New table: `activity_events`

```typescript
export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type"), // "icp" | "upload" | "draft" | "product" | "member"
  entityId: uuid("entity_id"),
  summary: text("summary").notNull(), // "Created ICP 'FinTech Companies'"
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Event types (v1):**

| Event Type | Entity Type | Triggered By |
|-----------|-------------|-------------|
| `icp_created` | icp | confirmImportIcps, saveClusterAsIcp |
| `icp_updated` | icp | saveIcpSnapshot |
| `icp_archived` | icp | archiveIcp |
| `scoring_run` | upload | processUpload |
| `draft_submitted` | draft | createDrafts |
| `draft_approved` | draft | approveDraft |
| `draft_rejected` | draft | rejectDraft |
| `product_updated` | product | saveProductContext |
| `member_invited` | member | inviteMember |
| `member_joined` | member | acceptInvite |

### Modified table: `memberships`

Add `invitedBy` field:

```typescript
invitedBy: uuid("invited_by").references(() => users.id),
```

Nullable — owner's membership has no inviter.

## 4. Roles & Permissions

Two roles: **Owner** and **Member**.

| Action | Owner | Member |
|--------|-------|--------|
| View all data (ICPs, scoring, deals, etc.) | Yes | Yes |
| Edit data (create/update ICPs, score leads, etc.) | Yes | Yes |
| Approve/reject drafts | Yes | Yes |
| Manage AI keys | Yes | Yes |
| Invite/remove members | Yes | **No** |
| Delete workspace | Yes | **No** |
| Transfer ownership | Yes | **No** |

### Permission check function

```typescript
// src/lib/permissions.ts
export function canManageTeam(role: string): boolean {
  return role === "owner";
}
```

Simple boolean check — no complex permission system. Called in server actions that modify team (invite, remove). UI uses the same check to show/hide management controls.

### Auth context update

`getAuthContext()` currently returns `{ userId, workspaceId }`. It needs to also return `role` from the membership record, so permission checks don't require additional DB queries.

```typescript
return {
  userId: user.id,
  workspaceId: membership.workspaceId,
  role: membership.role, // "owner" | "admin" | "member"
};
```

## 5. Invite Flow

### Step 1: Owner sends invite

Owner navigates to `/settings/team` → enters email → clicks "Invite".

Server action `inviteMember(email)`:
1. Auth check — verify caller is owner (`canManageTeam`)
2. Check email not already a member of this workspace
3. Check no pending invite for this email in this workspace
4. Generate 32-byte hex token
5. Insert `invites` record (status: "pending")
6. Send invite email via Supabase: call `supabase.auth.admin.inviteUserByEmail(email, { redirectTo })` or use custom email. The redirect URL is `{SITE_URL}/invite/{token}`.
7. Log activity: "member_invited"

**Email sending approach:** Use Supabase's built-in `inviteUserByEmail` if the user doesn't have a Supabase account yet. This creates the auth user and sends a magic link. If the user already has an account, send a custom notification (or just create the membership directly — see step 2).

**Simplified approach for v1:** Since Supabase `inviteUserByEmail` has caveats (auto-creates auth user, may conflict with existing accounts), use a simpler model:
- Insert invite record with token
- When invited user signs up or signs in, check for pending invites matching their email
- If found, auto-accept the invite and create membership

This avoids sending custom emails in v1. The invite acts as a "pre-approval" — when the person with that email shows up, they're automatically added.

### Step 2: Invited user signs up / signs in

In the `signUp` action (after creating user + their own workspace):
1. Check `invites` table for pending invites matching this email
2. For each pending invite: create `memberships` record, mark invite as "accepted"
3. Log activity: "member_joined"

In the `signIn` flow (or on dashboard load):
1. Same check — look for pending invites matching user's email
2. Auto-accept and create memberships

### Step 3: Invite acceptance page (optional, for explicit flow)

`/invite/[token]` page:
- If user is logged in → accept invite, redirect to dashboard of the new workspace
- If not logged in → redirect to sign-in with `?invite={token}` param, after sign-in accept automatically

### Workspace switching

After accepting an invite, a user belongs to multiple workspaces. Need a workspace switcher.

**Minimal v1:** On the topbar or sidebar, show current workspace name. If user has multiple workspaces, show a dropdown to switch. Switching changes the active workspace in the session/cookie.

**Implementation:** `getAuthContext()` currently returns the first membership. Change to: store `activeWorkspaceId` in a cookie. If not set, use the first membership. Workspace switcher updates the cookie.

## 6. Activity Feed

### Logging helper

```typescript
// src/lib/activity.ts
export async function logActivity(
  workspaceId: string,
  userId: string | null,
  event: {
    eventType: string;
    entityType?: string;
    entityId?: string;
    summary: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void>
```

Fire-and-forget — does not throw on failure (activity logging should never block the main action).

### Integration points

Add `logActivity()` calls to existing server actions:

| Server Action | Event |
|--------------|-------|
| `saveIcpSnapshot` in `src/actions/icps.ts` | `icp_updated`: "Updated ICP '{name}'" |
| `confirmImportIcps` in `src/actions/import-icp.ts` | `icp_created`: "Created ICP '{name}' from import" |
| `saveClusterAsIcp` in `src/actions/cluster-icp.ts` | `icp_created`: "Created ICP '{name}' from cluster" |
| `processUpload` in `src/actions/scoring.ts` | `scoring_run`: "Scored {totalRows} leads from '{fileName}'" |
| `approveDraft` in `src/actions/drafts.ts` | `draft_approved`: "Approved suggestion: {summary}" |
| `rejectDraft` in `src/actions/drafts.ts` | `draft_rejected`: "Rejected suggestion: {summary}" |
| `createDrafts` in `src/actions/drafts.ts` | `draft_submitted`: "Submitted {count} suggestion(s)" |
| `saveProductContext` in `src/actions/product-context.ts` | `product_updated`: "Updated product context" |
| `inviteMember` in `src/actions/team.ts` | `member_invited`: "Invited {email}" |

### Dashboard widget

New component `ActivityFeed` on dashboard — shows last 10 events:

```
┌─ Recent Activity ────────────────────────────────┐
│ 👤 You updated ICP "FinTech Companies"    2h ago │
│ 🤖 Agent submitted 3 suggestions         5h ago │
│ 👤 Alex scored 150 leads                 1d ago │
│ 👤 You invited alex@company.com          2d ago │
└──────────────────────────────────────────────────┘
```

- User avatar/icon + name (or "You" for current user, "Agent" for agent events)
- Event summary text
- Relative timestamp (timeAgo)
- Clickable — links to entity (ICP detail, scoring results, draft review)

Shows in `MainDashboard` state (when workspace has ICPs). Also visible in `HasIcpsState` (has ICPs but no scoring yet).

### Query

```typescript
// src/lib/queries/activity.ts
export async function getRecentActivity(workspaceId: string, limit = 10) {
  return db
    .select({
      ...activityEvents fields,
      userName: users.fullName,
    })
    .from(activityEvents)
    .leftJoin(users, eq(activityEvents.userId, users.id))
    .where(eq(activityEvents.workspaceId, workspaceId))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit);
}
```

## 7. Team Settings Page — `/settings/team`

### Layout

- Header: "Team" + subtitle "Manage workspace members"
- **Members section:** List of current members (avatar/initial, name, email, role badge, joined date). Owner sees "Remove" button on members (not on themselves).
- **Invite section** (Owner only): Email input + "Invite" button. Below: list of pending invites with "Cancel" button.

### Navigation

Add "Team" to sidebar nav items. Position: after "AI Settings" (last item in settings area).

For the sidebar, during onboarding (step < 4), Team is not shown (same as other advanced items).

## 8. Workspace Switcher

If user has multiple workspace memberships, show a switcher in the sidebar header (where the iseep logo is).

**Minimal implementation:**
- Sidebar header: click workspace name → dropdown of all user's workspaces → click to switch
- Switching sets a cookie `activeWorkspaceId` and reloads
- `getAuthContext()` reads the cookie to determine which workspace to use

**If only one workspace:** No dropdown, just the workspace name displayed.

## 9. File Structure

### New files

```
src/actions/team.ts                        — inviteMember, removeMember, cancelInvite, acceptInvite
src/lib/activity.ts                        — logActivity helper
src/lib/permissions.ts                     — canManageTeam
src/lib/queries/activity.ts                — getRecentActivity
src/app/(app)/settings/team/page.tsx       — Team settings server page
src/app/(app)/invite/[token]/page.tsx      — Invite acceptance page
src/components/settings/team-settings.tsx   — Team management UI (client)
src/components/dashboard/activity-feed.tsx  — Activity feed widget (client)
src/components/layout/workspace-switcher.tsx — Workspace dropdown (client)
```

### Modified files

```
src/db/schema.ts                — add invites + activityEvents tables, invitedBy on memberships
src/lib/auth.ts                 — return role from membership, read activeWorkspaceId cookie
src/actions/auth.ts             — check pending invites on sign-up/sign-in
src/actions/icps.ts             — add logActivity calls
src/actions/scoring.ts          — add logActivity call
src/actions/drafts.ts           — add logActivity calls
src/actions/product-context.ts  — add logActivity call
src/actions/import-icp.ts       — add logActivity call
src/components/dashboard/dashboard-view.tsx — add ActivityFeed widget
src/components/layout/sidebar.tsx — add "Team" nav item, workspace switcher
```

## 10. Migration

```sql
-- Invites table
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL REFERENCES users(id),
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- Activity events table
CREATE TABLE activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  summary text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast activity feed queries
CREATE INDEX idx_activity_events_workspace_created
  ON activity_events (workspace_id, created_at DESC);

-- Add invitedBy to memberships
ALTER TABLE memberships ADD COLUMN invited_by uuid REFERENCES users(id);
```

## 11. Security

- All team operations require authenticated workspace context
- Invite/remove limited to Owner role (checked in server action)
- Invite tokens are single-use — once accepted, cannot be reused
- Membership queries scoped by workspace
- Activity events scoped by workspace
- Workspace switcher only shows workspaces user is a member of

## 12. Backward Compatibility

- Existing single-user workspaces work unchanged (owner sees team settings with only themselves listed)
- `getAuthContext()` change adds `role` field — non-breaking (new field)
- Activity events table starts empty — dashboard shows "No recent activity" until actions occur
- No changes to draft system, scoring, or ICP management logic
