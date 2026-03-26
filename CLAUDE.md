@AGENTS.md

# iseep — Product & Architecture

## 1. Product Vision

iseep is a **GTM intelligence system** (NOT a CRM) that helps B2B sales teams:
- Define and manage Ideal Customer Profiles (ICPs)
- Score leads against ICPs with deterministic + AI-assisted matching
- Discover new market segments from unmatched leads
- Track deals, win/loss reasons, and product requests for ICP refinement

Built for INXY Payments (crypto payment gateway for B2B cross-border payouts), but designed as a generic multi-tenant SaaS platform.

**Status:** MVP — deployed on Vercel with Supabase backend.

## 2. Tech Stack

- **Framework:** Next.js 16 (App Router) — uses `proxy.ts` instead of `middleware.ts`
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-nova style, neutral theme)
- **Database:** Supabase (PostgreSQL) — auth + DB
- **ORM:** Drizzle ORM — schema in `src/db/schema.ts`, migrations in `drizzle/migrations/`
- **AI:** Anthropic Claude (default) / OpenAI (BYOK) via `src/lib/ai-client.ts`
- **Forms:** React Hook Form + Zod v4 (`zod/v4` import path)
- **Tables:** TanStack Table (data-heavy views)
- **State:** Zustand (only where needed)
- **Package Manager:** pnpm
- **Deployment:** Vercel serverless + Supabase connection pooler

## 3. Commands

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm drizzle-kit generate` — generate migration from schema
- `pnpm drizzle-kit push` — push schema to database
- `pnpm db:seed` — seed database with demo data

## 4. Architecture

### Key Decisions
- Route groups: `(auth)` for sign-in/sign-up, `(app)` for authenticated routes
- Auth via Supabase SSR — `proxy.ts` refreshes sessions and protects routes
- Server actions in `src/actions/` (NOT API routes) for all mutations
- All tables scoped by `workspace_id` for multi-tenancy
- Dynamic route params are `Promise<{ id: string }>` in Next.js 16 (must await)
- Import Zod from `zod/v4` (not `zod`)
- DB client configured for Vercel serverless + Supabase pooler (`src/db/index.ts`)

### File Structure

```
src/
├── app/
│   ├── (auth)/               # Auth pages (sign-in, sign-up, forgot-password)
│   ├── (app)/                # Authenticated app
│   │   ├── dashboard/        # Main dashboard
│   │   ├── icps/             # ICP list, new, [id], import
│   │   ├── personas/[id]/    # Persona detail
│   │   ├── segments/         # Segment list, new, [id]
│   │   ├── scoring/          # Upload list, upload wizard, [id] results, [id]/review-cluster
│   │   ├── deals/            # Deal list, new, [id]
│   │   ├── companies/        # Company list, new, [id]
│   │   ├── requests/         # Product requests
│   │   ├── insights/         # Win/loss analytics
│   │   ├── export/           # GTM Context Export page
│   │   ├── drafts/           # Suggestions inbox, import, [id] review
│   │   └── settings/         # product/, ai/
│   ├── api/context/          # GET /api/context (GTM context export)
│   ├── api/icps/             # GET /api/icps (read-only ICP list)
│   ├── api/scoring/latest/   # GET /api/scoring/latest (scoring results)
│   ├── api/drafts/           # POST endpoint for agent-submitted suggestions
│   ├── share/[token]/        # Public ICP share (no auth)
│   └── share/company/[token]/ # Public Company Profile + [icpId] drill-down
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # sidebar, topbar, app-shell
│   ├── dashboard/            # dashboard-view
│   ├── icps/                 # ICP management components
│   ├── scoring/              # scoring-results, upload-wizard, cluster-review, reject-icp-dialog
│   ├── settings/             # product-context-form, ai-settings-form (with API token card)
│   ├── export/               # export-page-view (format picker, preview, copy/download)
│   ├── drafts/               # draft-import-form, drafts-inbox, draft-review-view, draft-diff
│   ├── onboarding/           # onboarding-wizard, stepper, step-context, step-clarify, step-reveal
│   └── shared/               # product-context-nudge, ai-nudge, context-export-button, company-share-dialog, industry-picker
├── actions/                  # Server actions
│   ├── scoring.ts            # processUpload, processSampleData, deleteUpload
│   ├── cluster-icp.ts        # saveClusterAsIcp (adopt cluster → create ICP + reclassify leads)
│   ├── evaluate-cluster.ts   # evaluateClusterWithAi
│   ├── reject-icp.ts         # rejectSuggestedIcp
│   ├── import-icp.ts         # parseIcpAction, confirmImportIcps
│   ├── ai-keys.ts            # saveAiKey, removeAiKey, testAiKey
│   ├── product-context.ts    # saveProductContext
│   ├── company-sharing.ts    # enableCompanySharing, disableCompanySharing, updateCompanyShareConfig
│   ├── drafts.ts             # createDrafts, approveDraft, rejectDraft, generateApiToken
│   ├── onboarding.ts         # advanceOnboarding, goBackOnboarding, parseContext, refineContext
│   ├── team.ts               # inviteMember, removeMember, cancelInvite, acceptInvite, switchWorkspace
│   └── auth.ts               # signIn, signUp, signOut, requestPasswordReset
├── db/
│   ├── schema.ts             # Drizzle schema (23 tables)
│   ├── index.ts              # DB client (pooler-aware)
│   └── seed.ts               # Seed script
├── lib/
│   ├── auth.ts               # getAuthContext (workspace + user + role)
│   ├── api-auth.ts           # authenticateApiRequest (bearer token → workspaceId)
│   ├── permissions.ts        # canManageTeam (role check)
│   ├── activity.ts           # logActivity (fire-and-forget event logging)
│   ├── types.ts              # ActionResult, IcpSnapshotData
│   ├── constants.ts          # GROUP_LABELS, property options
│   ├── validators.ts         # Zod schemas
│   ├── scoring.ts            # Scoring engine (scoreLeadAgainstIcp, scoreLeadAgainstAllIcps)
│   ├── scoring/
│   │   ├── normalize-value.ts # normalizeValue() — extracted to avoid circular imports
│   │   ├── normalize.ts      # Value resolution (7-step: exact → case → taxonomy → synonym → memory → AI → none)
│   │   └── mapping-memory.ts # Workspace value mappings (learning from AI)
│   ├── value-mapper.ts       # AI-assisted value mapping (Claude/GPT)
│   ├── ai-client.ts          # AI provider factory (Anthropic/OpenAI, BYOK)
│   ├── ai-usage.ts           # Rate limiting (20 ops/month platform, unlimited BYOK)
│   ├── icp-parser.ts         # AI text-to-ICP extraction
│   ├── onboarding-parser.ts  # AI context parser (product + ICPs + missing questions)
│   ├── cluster-draft.ts      # Generate cluster drafts from unmatched leads
│   ├── cluster-evaluation.ts # Evaluate clusters (ICP similarity + product fit)
│   ├── sample-data.ts        # 20 sample leads for demo scoring
│   ├── segment-helpers.ts    # Condition tree manipulation
│   ├── taxonomy/             # Industry taxonomy (data, templates, lookup)
│   ├── context-export/       # GTM context export (types, builders, formatters)
│   ├── drafts/               # Draft system (types, parse, apply)
│   ├── queries/              # Server-side query functions
│   ├── supabase/             # Supabase client (browser + server)
│   └── proxy.ts              # Auth proxy (replaces middleware.ts)
└── drizzle/migrations/       # SQL migrations (0000-0006)
```

## 5. Core Entities (25 Tables)

### ICP System
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `icps` | Ideal Customer Profiles | name, status (draft/active/archived), version, shareToken, shareMode, parentIcpId |
| `criteria` | Scoring rules per ICP | group (5 types), category, value, intent (qualify/risk/exclude), weight (1-10), operator |
| `personas` | Target buyer personas | name (job title), description |
| `segments` | Audience segments with condition trees | logicJson (JSONB), status, priorityScore |
| `signals` | Behavioral indicators | type (positive/negative/neutral), label, strength |
| `icp_snapshots` | Version history | version, snapshotData (JSONB), changeSummary |

### Scoring System
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `scored_uploads` | CSV upload batches | fileName, sourceName, totalRows, columnMapping (JSONB) |
| `scored_leads` | Individual scored leads | rawData, fitScore (0-100), fitLevel (6 levels), confidence (0-100), matchReasons (JSONB), bestIcpId |

### Sales Context
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `companies` | Prospect companies | name, website, country, industry |
| `contacts` | People at companies | fullName, title, email, linkedinUrl |
| `deals` | Sales opportunities | stage, outcome (won/lost/open), dealValue, currency |
| `deal_reasons` | Win/loss analytics | reasonType (win/loss/objection), category, tag, severity |
| `meeting_notes` | Sales meeting docs | summary, sourceType (manual/notetaker/import) |
| `product_requests` | Feature requests | type (4 types), status (4 states), source, frequencyScore |

### Configuration
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `product_context` | Product positioning (1 per workspace) | productDescription, targetCustomers, coreUseCases[], keyValueProps[], industriesFocus[], geoFocus[], excludedIndustries[] |
| `ai_keys` | BYOK API keys (1 per workspace) | provider (anthropic/openai), apiKey, model, isActive |
| `ai_usage` | AI operation tracking | operation, tokensUsed |
| `value_mappings` | Learned synonym mappings | category, fromValue, toValue |
| `rejected_icps` | Rejected cluster industries | industry, reason, details |

### Draft System (Claude → iseep)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `drafts` | AI-proposed changes awaiting review | source (claude/manual/system), targetType (4 types), payload (JSONB), summary, reasoning, status (pending/rejected/applied), reviewedBy, appliedAt |

### Auth & Tenancy
| Table | Purpose |
|-------|---------|
| `workspaces` | Tenant root (name, slug, profileShareToken, apiToken) |
| `users` | Auth users (synced from Supabase) |
| `memberships` | User-workspace access (role: owner/admin/member) |

## 6. Scoring System [IMPLEMENTED]

### Architecture: Deterministic-First, AI-Optional

```
CSV Upload → Parse → Normalize → Score → Persist
                        ↓
              7-step value resolution:
              1. Exact match
              2. Case-insensitive
              3. Taxonomy resolve (industry category — alias → canonical name)
              4. Built-in synonyms (countries, platforms, titles)
              5. Workspace memory (learned mappings)
              6. AI mapping (Claude/GPT) — optional, rate-limited
              7. No match
```

### Three-Intent Scoring Model
- **Qualify** (weight 1-10): Positive fit indicators. Weighted average → base score (0-100)
- **Exclude** (hard blockers): If matched AND weight >= 7 → fitLevel="blocked", fitScore=0, early exit
- **Risk** (soft warnings): Each matched risk flag deducts 10 points from base score

### Fit Level Classification
| Level | Condition |
|-------|-----------|
| `blocked` | Any hard blocker matched (exclude intent, weight >= 7) |
| `high` | fitScore >= 70 |
| `medium` | fitScore >= 40 |
| `low` | fitScore > 0 |
| `risk` | riskFlags present AND fitScore < 50 |
| `none` | No match to any ICP |

### Confidence Score
`confidence = (dataCompleteness * 0.6 + matchQuality * 0.4) * 100`
- dataCompleteness: fieldsPresent / fieldsTotal
- matchQuality: exactOrSynonymMatches / totalMatches

### UI Groupings (Dashboard & Scoring Results)
- **High fit** = fitLevel "high" only
- **Borderline** = medium + low + risk
- **Blocked** = blocked
- **Unmatched** = none

### Workspace Memory Learning
AI mappings are auto-persisted to `value_mappings` table after successful scoring. Next scoring run loads these mappings, reducing AI calls over time.

## 7. Cluster / Segment Discovery [IMPLEMENTED]

### Flow
```
Scoring Run → Unmatched leads (fitLevel="none")
  → Group by industry → Clusters discovered
  → evaluateCluster() → ICP similarity + product fit scores
  → User decision:
     ├── Adopt → Create ICP + reclassify leads (matchType="adopted", fitScore=80)
     └── Reject → Add to rejectedIcps + excludedIndustries
```

### Cluster Draft Generation (`cluster-draft.ts`)
From unmatched leads, auto-generates:
- Suggested ICP name (from industry)
- Description (industry + top countries + size context)
- Draft criteria (industry weight:9, region weight:6, company size weight:4)
- Personas (extracted from contact titles, up to 3)
- Example companies (up to 5)

### Cluster Evaluation (`cluster-evaluation.ts`)
Two-phase scoring:

**ICP Similarity** — does this cluster overlap with existing ICPs?
- Industry match (+3), region match (+2)
- Result: high (>=4) / medium (>=2) / low (>=1) / none (0)

**Product Fit** — does this cluster align with the product? (requires product_context)
- Direct industry focus (+4), industry mention in product desc (+2)
- Payment product + payment-heavy industry (+3), mass payout signal (+3)
- Keyword overlap (+1-2), geographic overlap (+1)
- Result: high (>=7) / medium (>=4) / low (>=2) / none (<2) / unknown (no product context)

### Cluster Confidence
Combined metric: lead count + product fit + ICP similarity
- 5+ leads (+2), 3-4 (+1); high product fit (+2), medium (+1); high ICP sim (+1), medium (+0.5)
- Result: high (>=4) / medium (>=2) / low (<2)

### Learning Loop
1. User rejects cluster → industry added to `excludedIndustries` → future evaluations return "none"
2. User adopts cluster → ICP created + leads reclassified → future scoring uses new ICP

## 8. Product Context [IMPLEMENTED]

Separate entity (`product_context` table), one per workspace. NOT part of ICP — global context used for cluster evaluation and AI features.

**Fields:** companyName, website, productDescription (required), targetCustomers, coreUseCases[], keyValueProps[], industriesFocus[], geoFocus[], pricingModel, avgTicket, excludedIndustries[]

**Location:** Sidebar nav item "Product" → `/settings/product`

**Nudges:** Dismissible amber banner on dashboard, ICPs page when product context is missing. Dashboard empty state shows tip to add product context.

**Usage:** Required for AI cluster evaluation. Without it, product fit returns "unknown". With it, enables multi-factor cluster scoring.

## 9. BYOK (Bring Your Own Key) [IMPLEMENTED]

Users can configure personal Anthropic or OpenAI API keys at `/settings/ai`.

**Key selection:** User key (if active) → Platform Anthropic key (fallback)
**Default models:** Anthropic: claude-sonnet-4-20250514, OpenAI: gpt-4o
**Rate limits:** 20 ops/month (platform key), unlimited (user key)
**Security:** Keys stored in plain text in MVP (TODO: encrypt in production)

## 10. ICP Import [IMPLEMENTED]

3-step wizard at `/icps/import`:
1. **Input:** Paste text or upload file (.txt, .md, .csv)
2. **Review:** AI extracts multiple ICPs with criteria + personas. User can edit/select/delete
3. **Confirm:** Selected ICPs created as drafts with all criteria and personas

AI parser extracts: name, description, criteria (5 groups, 3 intents, weights), personas (title + description)

## 11. Public Company Profile Sharing [IMPLEMENTED]

Workspace-level public page showing product info + selected ICPs. Extends the single-ICP sharing with a company-wide profile.

**Schema:** 3 fields on `workspaces`: `profileShareToken`, `profileShareMode` (without_stats/with_stats), `profileSharedIcpIds` (JSONB, null = all active)

**Routes:**
- `/share/company/[token]` — public company profile page
- `/share/company/[token]/[icpId]` — ICP detail within company context

**UI:** Banner on ICPs page — CTA when inactive (dashed border, "Create public profile"), green status when active (link + copy + preview + settings). Settings dialog for mode + ICP selection.

## 12. GTM Context Export [IMPLEMENTED]

iseep as source of truth for GTM context — exportable for AI agents, partners, investors, teams.

**Architecture:** `src/lib/context-export/` — types, builders (server-side), formatters (pure functions).

**Three formats:**
- **JSON** — versioned (`schemaVersion: 1`), for agents/MCP/API consumers
- **Markdown** — for partners, wiki, documents
- **Compact text** — optimized for AI context window (copy-paste to Claude)

**Central page:** `/export` with module toggles (Product/ICPs/Scoring), format picker, live preview, copy + download.

**Contextual buttons:** Split button (copy + download dropdown) on:
- `/icps` — "Copy all ICPs"
- `/icps/[id]` — "Copy ICP"
- `/settings/product` — "Copy product context"

**Builders:** `buildFullContext(workspaceId, modules?)`, `buildProductContext(workspaceId)`, `buildIcpContext(workspaceId, icpId)`

## 13. Draft System — Claude → iseep [IMPLEMENTED]

AI agents (or users) propose changes through reviewable drafts. "Claude proposes, human approves, iseep applies."

**Schema:** `drafts` table — generic with typed JSONB payloads. Status: pending → applied or rejected.

**4 target types:**
- `create_icp` — new ICP with criteria + personas
- `update_product` — partial update to product context
- `update_icp` — add/remove criteria and personas (match-by-value, not UUID)
- `create_segment` — new segment linked to ICP

**Two input paths:**
- **Paste UI** (`/drafts/import`) — 3-step wizard: paste JSON → preview → create
- **API endpoint** (`POST /api/drafts`) — bearer token auth via `workspaces.apiToken`

**Review flow:** Inbox (`/drafts`) with filter tabs → Review page (`/drafts/[id]`) with type-specific diff → Approve & Apply (creates entity) or Reject

**Apply logic:** `src/lib/drafts/apply.ts` — handlers per type. ICP update bumps version + creates snapshot. Product update merges only provided fields.

**API token:** Generated at `/settings/ai` (API Access card). One per workspace.

**Zod validation:** Per-type payload schemas in `src/lib/drafts/types.ts` (Zod v4). Parser rejects invalid payloads with field-level errors.

## 14. Auth Improvements [IMPLEMENTED]

- **Duplicate email sign-up:** Handled gracefully — amber banner "Account exists" with Sign In + Reset Password CTAs (no more server crash)
- **Forgot password:** `/forgot-password` page — email input → Supabase reset link → "Check your email" success state
- **Sign-in:** "Forgot password?" link next to password field

## 15. AI Settings Improvements [IMPLEMENTED]

- **Security fix:** Raw API key no longer sent to client — masked on server before RSC payload
- **Discoverability:** "AI Settings" added to sidebar with Sparkles icon
- **AI nudge:** Banner on scoring page when no user key connected
- **AI Settings page redesign:**
  - AI Status card (connected state with provider/model/masked key, or usage meter)
  - "Where AI is used" section (3 feature cards linking to ICP Import, Scoring, Cluster Eval)
  - API Access card (generate/copy/regenerate API token for agent access)

## 16. Dialog Overflow Fix [IMPLEMENTED]

Added `overflow-hidden` to `DialogContent` in `src/components/ui/dialog.tsx` — prevents buttons overflowing rounded corners in all dialogs.

## 17. Industry Taxonomy System [IMPLEMENTED]

Two-level hierarchical taxonomy (~25 sectors → ~350 industries) stored as TypeScript data files in `src/lib/taxonomy/`.

**Architecture:**
- `data.ts` — `IndustryNode` type + `TAXONOMY` array with aliases, Clay mappings, and tags (payment-heavy, mass-payout)
- `templates.ts` — `AttributeTemplate` type + templates for 5 key sectors (Financial Services, Technology, Gaming & Betting, E-commerce & Marketplaces, Creator & Gig Economy)
- `lookup.ts` — in-memory indexes (`byId`, `byAlias`, `childrenOf`) + functions: `resolveIndustry`, `getChildren`, `getParent`, `isChildOf`, `searchIndustries`, `getTemplates`, `hasTag`, `getSectors`, `getById`

**Scoring integration:**
- New `"taxonomy"` and `"taxonomy_parent"` match types in scoring pipeline
- Taxonomy resolve step inserted before synonym lookup (step 3 in pipeline)
- Hierarchical matching: parent criterion (e.g., "Financial Services") matches all children (e.g., "FinTech")
- Old `INDUSTRY_SYNONYMS` removed from `normalize.ts`, migrated to taxonomy aliases
- `normalizeValue()` extracted to `normalize-value.ts` to avoid circular imports

**Cluster evaluation:**
- Hardcoded `PAYMENT_HEAVY_INDUSTRIES` and `MASS_PAYOUT_INDUSTRIES` replaced with taxonomy tag lookups via `hasTag()`
- `INDUSTRY_NEED_SIGNALS` re-keyed by taxonomy id

**UI:**
- `IndustryPicker` component (`src/components/shared/industry-picker.tsx`) — searchable grouped dropdown with sector headers, multi-select, custom fallback
- Integrated into ICP criteria form (replaces text input when category = "industry")
- Integrated into product context form (replaces text input for `industriesFocus`)
- Attribute template suggestions shown in criteria form when selecting industries with templates

**Backward compatible:** existing freeform industry values still work through fallback chain (workspace memory → AI)

## 18. Onboarding Wizard [IMPLEMENTED]

Context-driven 3-step wizard replacing dashboard empty state. Fullscreen layout (no sidebar/topbar).

**Data model:** `workspaces.onboardingStep` integer (0=not started, 1-2=in progress, 3+=completed). DB default is 4 (existing workspaces skip). New workspaces get 0 via signUp.

**Steps:**
1. **Context** (`step-context.tsx`) — User pastes free text about company/product/customers OR uses AI prompt template OR uploads .md/.txt file. Animated progress checklist during AI analysis (5 stages with timed transitions). AI parses text via `onboarding-parser.ts` → extracts product context + 3-5 ICPs + identifies missing info.
2. **Clarify** (`step-clarify.tsx`) — Shows "What we understood" summary (company, product, industries, geos, detected ICPs) + 3-5 AI-generated clarification questions with clickable hint suggestions ("Use suggestion" button fills input). Back navigation to step 1.
3. **Reveal** (`step-reveal.tsx`) — "Your GTM profile is ready" screen showing: Company Profile card, Share link CTA (generates public profile URL via `enableCompanySharing`), ALL generated ICPs (3-5) with criteria grouped by intent (qualify/risk/exclude) + personas. Next actions: Upload leads, Review ICPs, Invite team, Explore dashboard.

**Key design decisions:**
- ICPs created as **ACTIVE** (not draft) — immediate value
- Multiple ICPs generated (3-5 per industry vertical), not one generic
- No boring forms — single free-text input + AI does the work
- Fullscreen wizard (no sidebar) during onboarding (`onboardingStep < 3`)
- Share link prominently featured on reveal step

**AI Parser** (`src/lib/onboarding-parser.ts`):
- `parseOnboardingContext(text, workspaceId)` → `ParsedContext` with product, icps[], missingQuestions[], confidence
- `refineOnboardingContext(existing, answers, workspaceId)` → refined ParsedContext

**Actions** (`src/actions/onboarding.ts`):
- `parseContext(text)` — AI parse + save product context + advance to step 1
- `refineContext(answers)` — AI refine + create ACTIVE ICPs + advance to step 2
- `advanceOnboarding(step)` / `goBackOnboarding(step)` — step navigation

## 19. MCP Server [IMPLEMENTED]

Standalone MCP server (`mcp-server/`) for Claude Desktop and MCP-compatible agents.

**4 tools:**
- `get_context` — GET /api/context → GtmContextPackage JSON (product, ICPs, scoring)
- `list_icps` — GET /api/icps → active ICPs with criteria/personas
- `get_scoring_results` — GET /api/scoring/latest → scoring stats + top leads
- `submit_suggestions` — POST /api/drafts → submit drafts for review (existing)

**Architecture:** Standalone Node.js process communicating via stdio. Calls iseep HTTP API with bearer token auth. 3 new read-only API routes + shared `api-auth.ts` helper.

**Setup:** `cd mcp-server && npm install`, configure Claude Desktop with `ISEEP_API_TOKEN` and `ISEEP_BASE_URL` env vars.

**Dependencies:** `@modelcontextprotocol/sdk`, `tsx` for TypeScript execution.

## 20. Team Collaboration [IMPLEMENTED]

Email invites, Owner/Member roles, and activity feed for workspace collaboration.

**Team Management:**
- `invites` table — email-based invites with unique tokens, status (pending/accepted/expired)
- Owner/Member roles — Owner can invite/remove members, Member has full data access
- Team settings page at `/settings/team` — members list, invite form, pending invites
- Invite acceptance at `/invite/[token]` — auto-creates membership
- `getAuthContext()` now returns `role` alongside userId/workspaceId
- `canManageTeam(role)` permission check in `src/lib/permissions.ts`
- Workspace switcher support via `activeWorkspaceId` cookie

**Activity Feed:**
- `activity_events` table — 10 event types (icp_created/updated, scoring_run, draft_submitted/approved/rejected, product_updated, member_invited/joined)
- `logActivity()` helper in `src/lib/activity.ts` — fire-and-forget, integrated into ICP, scoring, drafts, and product context actions
- Dashboard widget showing last 10 events with user names and relative timestamps

## 21. Navigation (Sidebar)

1. Dashboard (`/dashboard`)
2. Product (`/settings/product`)
3. ICPs (`/icps`)
4. Segments (`/segments`)
5. Deals (`/deals`)
6. Companies (`/companies`)
7. Requests (`/requests`)
8. Insights (`/insights`)
9. Score Leads (`/scoring`)
10. Export (`/export`)
11. Suggestions (`/drafts`)
12. AI Settings (`/settings/ai`)
13. Team (`/settings/team`)

## 22. Routes

### Auth
| Route | Purpose |
|-------|---------|
| `/sign-in` | Login |
| `/sign-up` | Registration + workspace setup |
| `/forgot-password` | Password reset request |

### App
| Route | Purpose |
|-------|---------|
| `/dashboard` | State-aware overview (empty → has ICPs → has scoring) |
| `/settings/product` | Product context form |
| `/settings/ai` | BYOK API key + API token management |
| `/icps` | ICP list + company share banner |
| `/icps/new` | Create ICP manually |
| `/icps/import` | Import ICP from text/file (AI) |
| `/icps/[id]` | ICP detail (tabs: Overview, Personas, Signals, History) |
| `/personas/[id]` | Persona detail with linked criteria |
| `/segments` | Segment list grouped by ICP |
| `/segments/new` | Create segment |
| `/segments/[id]` | Segment detail with condition tree |
| `/scoring` | Scored uploads list |
| `/scoring/upload` | CSV upload wizard with column mapping |
| `/scoring/[id]` | Scoring results (stats bar, lead table, cluster discovery) |
| `/scoring/[id]/review-cluster` | Cluster review → create ICP from unmatched leads |
| `/export` | GTM Context Export (format picker, preview, copy, download) |
| `/drafts` | Suggestions inbox (filter: pending/applied/rejected) |
| `/drafts/import` | Paste Claude JSON → parse → create suggestions |
| `/drafts/[id]` | Review suggestion with diff → approve/reject |
| `/deals` | Deal list |
| `/deals/new` | Create deal |
| `/deals/[id]` | Deal detail (reasons, notes, ICP links) |
| `/companies` | Company list |
| `/companies/new` | Create company |
| `/companies/[id]` | Company detail with contacts |
| `/requests` | Product requests from deals |
| `/insights` | Win/loss analytics |

### Public (no auth)
| Route | Purpose |
|-------|---------|
| `/share/[token]` | Public ICP share |
| `/share/company/[token]` | Public Company Profile |
| `/share/company/[token]/[icpId]` | ICP detail within company profile |

### API
| Route | Purpose |
|-------|---------|
| `GET /api/context` | GTM context export (bearer token auth) |
| `GET /api/icps` | Read-only ICP list with criteria/personas (bearer token auth) |
| `GET /api/scoring/latest` | Latest scoring results (bearer token auth) |
| `POST /api/drafts` | Agent-submitted suggestions (bearer token auth) |

## 23. Current State vs Target State

| Feature | Status | Notes |
|---------|--------|-------|
| ICP management (CRUD, criteria, personas, signals) | [IMPLEMENTED] | Full CRUD with versioning, sharing |
| Scoring engine (deterministic + AI) | [IMPLEMENTED] | 7-step resolution (taxonomy added), 3 intents, confidence |
| AI-assisted value mapping | [IMPLEMENTED] | Claude/GPT with fallback chain |
| Workspace memory (learning) | [IMPLEMENTED] | Auto-persisted from AI mappings |
| CSV upload & column mapping | [IMPLEMENTED] | Drag-drop + column mapper |
| Scoring results UI | [IMPLEMENTED] | Stats bar, filterable table, export |
| Cluster discovery from unmatched leads | [IMPLEMENTED] | Auto-grouping by industry |
| Cluster evaluation (ICP similarity + product fit) | [IMPLEMENTED] | Multi-factor scoring |
| Cluster → ICP creation (prefilled) | [IMPLEMENTED] | Editable draft with criteria/personas |
| Lead reclassification on adopt | [IMPLEMENTED] | Unmatched → high (score 80) |
| Cluster rejection + learning | [IMPLEMENTED] | Excluded industries persist |
| Product context (separate entity) | [IMPLEMENTED] | Dedicated table, all target fields |
| Product context nudges | [PARTIAL] | Dismissible banner, no persistent dismissal state |
| Onboarding wizard | [IMPLEMENTED] | Context-driven 3-step: paste context → AI clarify → reveal profile + multiple active ICPs |
| Team collaboration | [IMPLEMENTED] | Email invites, Owner/Member roles, activity feed |
| BYOK (Anthropic + OpenAI) | [IMPLEMENTED] | Key management, test, rate limits, security fix (masked keys) |
| ICP import from text/file | [IMPLEMENTED] | 3-step wizard with AI parsing |
| ICP sharing (public pages) | [IMPLEMENTED] | Token-based share links, 2 modes |
| Company profile sharing | [IMPLEMENTED] | Workspace-level public page, mode selection, ICP picker |
| GTM Context Export | [IMPLEMENTED] | 3 formats (JSON/MD/text), central page + contextual buttons |
| Draft system (Claude → iseep) | [IMPLEMENTED] | 4 target types, paste UI + API, review + approve/reject |
| API endpoint for agents | [IMPLEMENTED] | POST /api/drafts with bearer token auth |
| Auth: duplicate email handling | [IMPLEMENTED] | Friendly error + password reset CTA |
| Auth: forgot password | [IMPLEMENTED] | Supabase reset flow |
| AI settings discoverability | [IMPLEMENTED] | Sidebar item, nudges, "Where AI is used" section |
| Deals with win/loss tracking | [IMPLEMENTED] | Companies, contacts, reasons, notes |
| Product requests lifecycle | [IMPLEMENTED] | 4 types, 4 statuses, linked to deals |
| Insights analytics | [IMPLEMENTED] | Win/loss patterns by ICP |
| Industry taxonomy (normalized) | [IMPLEMENTED] | Two-level hierarchy (25 sectors, ~350 industries), aliases, hierarchical scoring, picker UI |
| Segment builder with condition logic | [IMPLEMENTED] | Flat Include/Exclude/Risk rules |
| Match explanation layer | [IMPLEMENTED] | matchReasons[] with per-criterion detail |
| AI key encryption | [MISSING] | Plain text in MVP |
| Onboarding flow | [IMPLEMENTED] | Context-driven wizard with AI parsing |
| Inline draft editing | [MISSING] | Edit suggestion before approve (currently approve as-is or reject) |
| MCP server for Claude Desktop | [IMPLEMENTED] | 4 tools: get_context, list_icps, get_scoring_results, submit_suggestions |

## 24. Known Gaps (Prioritized)

### P0 — Security
1. **AI key / API token encryption** — keys and tokens stored plain text. Must encrypt before production launch.

### P1 — Product Completeness
(All P1 items completed)

### P2 — UX Polish
5. **Persistent nudge dismissal** — currently client-side only, resets on page reload
6. **Inline draft editing** — edit suggestion payload before approving
7. **Batch approve drafts** — approve multiple suggestions at once from inbox
8. **Segment discovery (Level 2)** — auto-generated segments from scoring patterns

### P3 — Scale
9. **Batch scoring optimization** — current per-lead loop, could batch DB inserts better
10. **Token tracking enforcement** — tokens logged but not enforced in limits

## 25. Conventions

- Use shadcn/ui components for all UI
- Use server actions for mutations, not API routes (exception: `POST /api/drafts` for external agent access)
- All pages use `createClient()` from `@/lib/supabase/server` for auth
- Raw API keys never sent to client — mask on server before RSC payload
- Dynamic route params are `Promise<{ id: string }>` in Next.js 16 (must await)
- Import Zod from `zod/v4` (not `zod`)
- Criteria groups: firmographic, technographic, behavioral, compliance, keyword
- Criteria intents: qualify (positive, weighted), risk (penalty), exclude (hard blocker)
- Fit levels: high, medium, low, risk, blocked, none
