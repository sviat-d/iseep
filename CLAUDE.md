@AGENTS.md

# iseep — Product & Architecture

> Last synced: 2026-03-28 (after legacy CRM cleanup, tag `afterclean1`)

## 1. Product Vision

iseep is a **GTM intelligence system** (NOT a CRM) that helps B2B sales teams:
- Manage multiple **Products** per company, each with its own ICPs and context
- Define and manage **Ideal Customer Profiles (ICPs)** — shared across products via many-to-many
- Score leads against ICPs with deterministic + AI-assisted matching
- Capture **Cases** (won/lost/in-progress evidence) scoped per Product + ICP
- Track **product Use Cases** for structured ICP learning
- Build and test **Hypotheses** — structured GTM assumptions linking signals, personas, and narrative
- Discover new market segments from unmatched leads

Built for INXY Payments (crypto payment gateway for B2B cross-border payouts), but designed as a generic multi-tenant SaaS platform.

**Status:** MVP — deployed on Vercel with Supabase backend.

**Core hierarchy:** Company → Products → ICPs → Hypotheses → Cases

## 2. Tech Stack

- **Framework:** Next.js 16 (App Router) — uses `proxy.ts` instead of `middleware.ts`
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-nova style, neutral theme)
- **Database:** Supabase (PostgreSQL) — auth + DB
- **ORM:** Drizzle ORM — schema in `src/db/schema.ts`, migrations in `drizzle/migrations/`
- **AI:** Anthropic Claude (default) / OpenAI (BYOK) via `src/lib/ai-client.ts`
- **Forms:** React Hook Form + Zod v4 (`zod/v4` import path)
- **Tables:** TanStack Table (data-heavy views)
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
- No client-side state management library — server actions + React state only

### File Structure

```
src/
├── app/
│   ├── (auth)/               # Auth pages (sign-in, sign-up, forgot-password)
│   ├── (app)/                # Authenticated app
│   │   ├── dashboard/        # Main dashboard + onboarding wizard
│   │   ├── icps/             # ICP list, new, [id], import
│   │   ├── personas/[id]/    # Persona detail
│   │   ├── scoring/          # Upload list, upload wizard, [id] results, [id]/review-cluster
│   │   ├── drafts/           # Suggestions inbox, import, [id] review
│   │   ├── invite/[token]/   # Team invite acceptance
│   │   └── settings/         # ai/, team/, product (redirects to /icps)
│   ├── api/context/          # GET /api/context (GTM context export)
│   ├── api/icps/             # GET /api/icps (read-only ICP list)
│   ├── api/scoring/latest/   # GET /api/scoring/latest (scoring results)
│   ├── api/drafts/           # POST endpoint for agent-submitted suggestions
│   ├── share/[token]/        # Public ICP share (no auth)
│   └── share/company/[token]/ # Public Company Profile + [icpId] drill-down
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # sidebar, topbar, app-shell
│   ├── dashboard/            # dashboard-view, activity-feed
│   ├── icps/                 # ICP management (icp-manage-products-dialog, icp-cases-tab, icp-tabs, etc.)
│   ├── hypotheses/           # hypothesis-tab (form dialog + cards + metrics)
│   ├── personas/             # persona-list, persona-card, persona-form-dialog
│   ├── criteria/             # criteria-grouped-list, criterion-form-dialog (signal modal)
│   ├── signals/              # signal-list, signal-form-dialog
│   ├── scoring/              # scoring-results, upload-wizard, cluster-review, reject-icp-dialog
│   ├── settings/             # ai-settings-form, team-settings, settings-nav
│   ├── drafts/               # draft-import-form, drafts-inbox, draft-review-view, draft-diff
│   ├── onboarding/           # onboarding-wizard, stepper, step-context, step-clarify, step-reveal
│   └── shared/               # product-context-nudge, ai-nudge, context-export-button, company-share-dialog, industry-picker
├── actions/
│   ├── auth.ts               # signIn, signUp, signOut, requestPasswordReset
│   ├── onboarding.ts         # advanceOnboarding, goBackOnboarding, parseContext, refineContext
│   ├── icps.ts               # createIcp, updateIcp, deleteIcp, saveIcpSnapshot
│   ├── criteria.ts           # createCriterion, updateCriterion, deleteCriterion
│   ├── personas.ts           # createPersona, updatePersona, deletePersona
│   ├── signals.ts            # createSignal, updateSignal, deleteSignal
│   ├── hypotheses.ts         # createHypothesis, updateHypothesis, deleteHypothesis, getHypothesesForIcp
│   ├── evidence.ts           # addCase, updateCase, deleteCase, getCasesForIcp, findRelatedCases
│   ├── products.ts           # createProduct, updateProductFull, deleteProduct, getProducts
│   ├── product-icps.ts       # linkIcpToProduct, duplicateIcpForProduct, updateIcpProducts
│   ├── use-cases.ts          # createUseCase, deleteUseCase, getUseCasesForProduct
│   ├── scoring.ts            # processUpload, processSampleData, deleteUpload
│   ├── cluster-icp.ts        # saveClusterAsIcp
│   ├── evaluate-cluster.ts   # evaluateClusterWithAi
│   ├── reject-icp.ts         # rejectSuggestedIcp
│   ├── import-icp.ts         # parseIcpAction, confirmImportIcps
│   ├── ai-keys.ts            # saveAiKey, removeAiKey, testAiKey
│   ├── company.ts            # updateCompanyInfo
│   ├── company-sharing.ts    # enableCompanySharing, disableCompanySharing, updateCompanyShareConfig
│   ├── sharing.ts            # enableSharing, disableSharing, updateShareMode (ICP-level)
│   ├── drafts.ts             # createDrafts, approveDraft, rejectDraft, generateApiToken
│   ├── team.ts               # inviteMember, removeMember, cancelInvite, acceptInvite, switchWorkspace
│   └── industry.ts           # mergeIndustryValue
├── db/
│   ├── schema.ts             # Drizzle schema (~32 tables)
│   ├── index.ts              # DB client (pooler-aware)
│   └── seed.ts               # Seed script
├── lib/
│   ├── auth.ts               # getAuthContext (workspace + user + role)
│   ├── api-auth.ts           # authenticateApiRequest (bearer token → workspaceId)
│   ├── permissions.ts        # canManageTeam (role check)
│   ├── activity.ts           # logActivity (fire-and-forget event logging)
│   ├── types.ts              # ActionResult, IcpSnapshotData
│   ├── constants.ts          # GROUP_LABELS, PICKER_TIERS, SIGNAL_STRENGTHS, BUSINESS_MODEL_PRESETS
│   ├── validators.ts         # Zod schemas (hypothesisSchema, etc.)
│   ├── utils.ts              # cn() and shared utilities
│   ├── scoring.ts            # Scoring engine (scoreLeadAgainstIcp, scoreLeadAgainstAllIcps)
│   ├── scoring/
│   │   ├── normalize-value.ts # normalizeValue()
│   │   ├── normalize.ts      # 7-step value resolution
│   │   └── mapping-memory.ts # Workspace value mappings (learning from AI)
│   ├── value-mapper.ts       # AI-assisted value mapping (Claude/GPT)
│   ├── ai-client.ts          # AI provider factory (Anthropic/OpenAI, BYOK)
│   ├── ai-usage.ts           # Rate limiting (20 ops/month platform, unlimited BYOK)
│   ├── icp-parser.ts         # AI text-to-ICP extraction
│   ├── icp-diff.ts           # Snapshot diffing for version history
│   ├── onboarding-parser.ts  # AI context parser (product + ICPs + missing questions)
│   ├── cluster-draft.ts      # Generate cluster drafts from unmatched leads
│   ├── cluster-evaluation.ts # Evaluate clusters (ICP similarity + product fit)
│   ├── sample-data.ts        # 20 sample leads for demo scoring
│   ├── taxonomy/             # Industry taxonomy (data, templates, lookup)
│   ├── context-export/       # GTM context export (types, builders, formatters)
│   ├── drafts/               # Draft system (types, parse, apply)
│   ├── queries/              # Server-side query functions
│   │   ├── dashboard.ts      # getIcpOverview
│   │   ├── icps.ts           # getIcps, getIcp
│   │   ├── scoring.ts        # getScoredUploads, getScoredLeadStats
│   │   ├── personas.ts       # getPersona
│   │   ├── activity.ts       # getRecentActivity
│   │   ├── company-profile.ts # getCompanyProfile (public share)
│   │   ├── product-context.ts # getProductContext (reads legacy table, still used)
│   │   └── workspace.ts      # getWorkspaceName
│   ├── supabase/             # Supabase client (browser + server)
│   └── proxy.ts              # Auth proxy (replaces middleware.ts)
└── drizzle/migrations/       # SQL migrations
```

## 5. Core Entities

### Company & Products
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `workspaces` | Company/tenant root | name, website, companyDescription, targetCustomers, industriesFocus[], geoFocus[], onboardingStep |
| `products` | Solutions/offerings per company | name, shortDescription, description, coreUseCases[], keyValueProps[], pricingModel, avgTicket |
| `product_use_cases` | Practical usage flows per product | name, normalizedName, unique per (product, normalizedName) |
| `product_context` | **[LEGACY READ-ONLY]** Old mixed product/company data | Still queried by dashboard, scoring, export. No UI writes to it anymore. |

### ICP System (Many-to-Many with Products)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `icps` | Ideal Customer Profiles (shared definitions) | name, status (draft/active/archived), version, shareToken, shareMode |
| `product_icps` | Many-to-many: Product ↔ ICP links | productId, icpId, unique per pair |
| `criteria` | Scoring signals per ICP (UI calls them "signals") | group (5 types), category, value, intent (qualify/risk/exclude), weight (1-10) |
| `personas` | Target buyer personas | name, description, goals, painPoints, triggers, decisionCriteria, objections, desiredOutcome |
| `hypotheses` | GTM hypotheses per ICP | name, selectedCriteriaIds[], selectedPersonaIds[], selectedSignalIds[], productIds[], problem, solution, outcome, status, metrics |
| `signals` | Behavioral indicators | type (positive/negative/neutral), label, strength |
| `icp_snapshots` | Version history | version, snapshotData (JSONB), changeSummary |

### Cases (ICP Learning Loop, Product-Scoped)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `icp_evidence` | Won/lost/in-progress cases | companyName, outcome, productIds[], useCaseIds[], hypothesisId, dealValue, dealType, whyWon, whyLost, channel, channelDetail, reasonTags[], note |

### Scoring System
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `scored_uploads` | CSV upload batches | fileName, totalRows, columnMapping (JSONB) |
| `scored_leads` | Individual scored leads | rawData, fitScore (0-100), fitLevel (6 levels), confidence, matchReasons (JSONB) |

### Configuration
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ai_keys` | BYOK API keys (1 per workspace) | provider (anthropic/openai), apiKey, model, isActive |
| `ai_usage` | AI operation tracking | operation, tokensUsed |
| `value_mappings` | Learned synonym mappings | category, fromValue, toValue |
| `rejected_icps` | Rejected cluster industries | industry, reason, details |

### Draft System (Claude → iseep)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `drafts` | AI-proposed changes awaiting review | source, targetType, payload (JSONB), status (pending/rejected/applied) |

### Auth & Tenancy
| Table | Purpose |
|-------|---------|
| `workspaces` | Company/tenant root with company info fields |
| `users` | Auth users (synced from Supabase) |
| `memberships` | User-workspace access (role: owner/admin/member) |
| `invites` | Email-based team invites with tokens |
| `activity_events` | Audit trail (10+ event types) |

### Legacy Tables (DB schema only, no UI)
These tables exist in `schema.ts` and the database but have **no frontend code**. All routes, components, actions, and queries were removed in the `afterclean1` cleanup. Data may still exist in production DB.

| Table | Was | Replaced By |
|-------|-----|------------|
| `companies` | Prospect companies | Cases (companyName field) |
| `deals` | Sales opportunities | Cases + Hypotheses |
| `deal_reasons` | Win/loss reasons | Cases reason tags |
| `contacts` | Company contacts | Removed |
| `meeting_notes` | Deal meeting notes | Removed |
| `product_requests` | Feature requests from deals | Removed |
| `segments` | Audience segments with condition trees | Hypotheses (segmentation layer) |

## 6. Routes

### Sidebar Navigation (4 items)
1. `/dashboard` — ICP-focused control center + onboarding wizard
2. `/icps` — Products & ICPs main workspace
3. `/scoring` — Score Leads (Beta badge)
4. `/settings` — hub with sub-nav for AI Settings + Team

### All Active Routes

**Auth:**
| Route | Purpose |
|-------|---------|
| `/sign-in` | Login |
| `/sign-up` | Registration + workspace setup |
| `/forgot-password` | Password reset request |

**App (authenticated):**
| Route | Purpose |
|-------|---------|
| `/dashboard` | State-aware overview (onboarding → ICPs → scoring) |
| `/icps` | ICP list + company share banner + company/product blocks |
| `/icps/new` | Create ICP manually |
| `/icps/import` | Import ICP from text/file (AI) |
| `/icps/[id]?product=X` | ICP detail (tabs: Criteria, Personas, Signals, Hypotheses, Cases, Versions) |
| `/personas/[id]` | Persona detail with linked criteria |
| `/scoring` | Scored uploads list |
| `/scoring/upload` | CSV upload wizard with column mapping |
| `/scoring/[id]` | Scoring results (stats bar, lead table, cluster discovery) |
| `/scoring/[id]/review-cluster` | Cluster review → create ICP from unmatched leads |
| `/drafts` | Suggestions inbox (filter: pending/applied/rejected) |
| `/drafts/import` | Paste Claude JSON → parse → create suggestions |
| `/drafts/[id]` | Review suggestion with diff → approve/reject |
| `/settings/ai` | BYOK API key + API token management |
| `/settings/team` | Team members, invites |
| `/settings/product` | Redirects to `/icps` |
| `/invite/[token]` | Accept team invite |

**Public (no auth):**
| Route | Purpose |
|-------|---------|
| `/share/[token]` | Public ICP share |
| `/share/company/[token]` | Public Company Profile |
| `/share/company/[token]/[icpId]` | ICP detail within company profile |

**API:**
| Route | Purpose |
|-------|---------|
| `GET /api/context` | GTM context export (bearer token auth) |
| `GET /api/icps` | Read-only ICP list with criteria/personas (bearer token auth) |
| `GET /api/scoring/latest` | Latest scoring results (bearer token auth) |
| `POST /api/drafts` | Agent-submitted suggestions (bearer token auth) |

## 7. Core Systems

### Scoring System
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

**Three-Intent Scoring Model:**
- **Qualify** (weight 1-10): Positive fit indicators. Weighted average → base score (0-100)
- **Exclude** (hard blockers): If matched AND weight >= 7 → fitLevel="blocked", fitScore=0, early exit
- **Risk** (soft warnings): Each matched risk flag deducts 10 points

**Fit Levels:** blocked, high (>=70), medium (>=40), low (>0), risk (flags + <50), none

**Confidence:** `(dataCompleteness * 0.6 + matchQuality * 0.4) * 100`

**Memory Learning:** AI mappings auto-persisted to `value_mappings` table. Next run uses them, reducing AI calls.

### Cluster Discovery
Unmatched leads (fitLevel="none") → group by industry → evaluate (ICP similarity + product fit) → user adopts (creates ICP + reclassifies leads) or rejects (excluded in future).

### ICP Signal System
UI says "signal", DB says `criteria`. 3 intent sections: Good fit / Risk / Not a fit. Strength labels: Strong (>=8), Medium (4-7), Weak (<=3). Add signal modal: 2-step (attribute picker → configure).

### Hypotheses System
Mental model: Criteria = WHO fits, Personas = WHO inside company, Signals = WHEN to reach out, Hypothesis = HOW to position, Cases = RESULT. Chip-based selection from ICP's entities. Multi-product. Outreach metrics with auto-calculated rates.

### Cases (Evidence)
Product-scoped. Won/lost/in-progress. Links to hypothesis (partial product overlap OK). Deal tracking (value, type, whyWon/whyLost). Multi-product via productIds[]. Use cases via useCaseIds[].

### Onboarding Wizard
3-step fullscreen wizard: paste context → AI clarify → reveal profile + ICPs. Creates ACTIVE ICPs (not drafts). `workspaces.onboardingStep` controls flow (0=not started, 3+=completed).

### Draft System (Claude → iseep)
4 target types: create_icp, update_product, update_icp, create_segment. Two input paths: paste UI + API endpoint. Review flow: inbox → diff → approve/reject.

### GTM Context Export
3 formats (JSON/Markdown/Compact text). Contextual buttons on `/icps` and `/icps/[id]`. Builders in `src/lib/context-export/`. No separate export page (removed in cleanup).

### Industry Taxonomy
Two-level hierarchy (~25 sectors → ~350 industries) in `src/lib/taxonomy/`. Integrated into scoring pipeline (step 3), cluster evaluation, and UI (IndustryPicker component).

### MCP Server
Standalone in `mcp-server/`. 4 tools: get_context, list_icps, get_scoring_results, submit_suggestions. Calls iseep HTTP API with bearer token.

### Team Collaboration
Email invites, Owner/Member roles, activity feed. `/settings/team` for management. `logActivity()` integrated into all major actions.

### BYOK (Bring Your Own Key)
Anthropic/OpenAI at `/settings/ai`. User key → platform key (fallback). 20 ops/month (platform), unlimited (BYOK). Keys masked on server before RSC payload.

## 8. Multi-Product Architecture

- Company info on `workspaces` table, editable inline on `/icps`
- Product info on `products` table, editable inline on `/icps`
- ICPs linked via `product_icps` many-to-many
- Cases product-scoped via `productIds[]`
- Hypotheses multi-product via `productIds[]`
- Product switching is client-side (instant)
- Shared ICP: `?product=` URL param determines which product's cases/use cases to show
- Safe unlink: blocks ICP product removal if hypotheses/cases use that product

## 9. Legacy & Technical Debt

### product_context Table
**Status:** Read-only legacy. Queried by dashboard, scoring, cluster evaluation, context-export. No UI writes to it (action deleted). Onboarding writes to workspaces + products instead.
**Migration needed:** Move remaining reads to products/workspaces tables.

### Legacy DB Columns (Active Fallbacks)
These columns have newer replacements but old data may use them. Fallback logic in UI reads both.
- `icps.productId` → replaced by `product_icps` M2M
- `icp_evidence.productId` (single) → replaced by `productIds[]`
- `icp_evidence.useCaseId` (single) → replaced by `useCaseIds[]`
- `icp_evidence.hypothesis` (text) → replaced by `hypothesisId` FK
- `hypotheses.valueProposition` → replaced by `solution`
- `hypotheses.expectedResult` → replaced by `outcome`
- `hypotheses.metricsLeads..metricsWins` → replaced by recipients/sqls/etc.
- `hypotheses.segmentId`, `hypotheses.personaId` → replaced by multi-select arrays

### Legacy DB Tables (Schema Only)
Tables `companies`, `deals`, `deal_reasons`, `contacts`, `meeting_notes`, `product_requests`, `segments` exist in schema.ts but have NO frontend code. All pages, components, actions, and queries were removed in cleanup. The `segments` table is still referenced by `drafts/apply.ts` (create_segment draft type) and by `products.ts:deleteProduct()` for cascade cleanup.

## 10. Git & Deployment

### Branches
- `main` — production (Vercel production deployment)
- `ux/experiment-v1` — UX experiment branch (Vercel preview deployment)
- `backup/afterclean1` — snapshot of clean state post-cleanup
- `backup/pre-cleanup` — snapshot before cleanup (includes all legacy CRM code)

### Tags
- `afterclean1` — stable baseline after cleanup (commit 8db28cb)
- `v0-pre-cleanup` — state before cleanup (commit 07124e3)

### Cleanup History (2026-03-28)
Removed 64 files, -6,579 lines. Archived: Deals, Companies, Product Requests, Segments UI. Deleted: Insights, Export page, orphaned components, dead code, zustand dependency.

## 11. Known Gaps

### P0 — Security
1. **AI key / API token encryption** — stored plain text. Must encrypt before production launch.

### P2 — UX Polish
1. **Persistent nudge dismissal** — client-side only, resets on reload
2. **Inline draft editing** — edit suggestion payload before approving
3. **Batch approve drafts** — approve multiple from inbox
4. **Email invites (Resend)** — DB records created but NO emails sent. Needs Resend integration.

### P2 — Technical
5. **product_context migration** — move reads to products/workspaces, then drop table
6. **Legacy column cleanup** — remove fallback logic after confirming no old data in prod

### P3 — Scale
7. **Batch scoring optimization** — current per-lead loop
8. **Token tracking enforcement** — logged but not enforced
9. **product_icps query optimization** — linkedProductIds via separate query + Map merge (Drizzle workaround)

## 12. Conventions

### Architecture
- Server actions for mutations, API routes only for external access (POST /api/drafts)
- All pages use `createClient()` from `@/lib/supabase/server` for auth
- All heavy pages use `Promise.all` for parallel DB queries
- Loading skeletons via `loading.tsx` on main routes
- DB pool: max 5 connections
- No client-side state library — server actions + React state

### Code Style
- shadcn/ui for all UI components
- Import Zod from `zod/v4` (not `zod`)
- Dynamic route params are `Promise<{ id: string }>` in Next.js 16 (must await)
- Raw API keys never sent to client — mask on server before RSC payload
- Dialog base width: `sm:max-w-md`

### Data Model
- Company info on `workspaces` table (NOT product_context)
- Product info on `products` table
- ICP sharing: many-to-many via `product_icps`
- Cases product-scoped via `icp_evidence.productIds[]`
- Use cases: multi-select via `useCaseIds` jsonb array (legacy `useCaseId` single FK kept for backward compat)
- Criteria groups: firmographic, technographic, behavioral, compliance, keyword
- Criteria intents: qualify (positive), risk (penalty), exclude (hard blocker)
- Fit levels: high, medium, low, risk, blocked, none

### UI Conventions
- ICP signals: UI says "signal", DB says "criteria" — mapping is UI-only
- Signal strength: weight >= 8 = Strong, 4-7 = Medium, <= 3 = Weak
- Signal strength order in modal: Weak → Medium → Strong (left to right)
- Intent order in modal: Not a fit → Risk → Good fit (left to right)
- Add signal modal: 2-step (picker → configure), picker NEVER bypassed for new signals
- Business model: multi-select preset chips, stored as comma-separated string
- Product switcher: clickable chips on shared ICP detail page
- Hypothesis ↔ Case matching: intersection-based (≥1 shared product)
- Percentage formatter: `fmtPct()` — up to 2 decimal places, strips trailing zeros
- Metric inputs: string state with placeholder="0"
- Deal types: MRR, One-time, All time, LTV estimated

### Navigation
- ICP detail: `?product=` URL param for shared ICPs
- Secondary entry points (dashboard, activity feed) fall back to first linked product
- `/settings/product` redirects to `/icps`
- Onboarding: fullscreen wizard (no sidebar) when `onboardingStep < 3`
- Drafts: not in sidebar, accessed via activity feed links and AI Settings docs
