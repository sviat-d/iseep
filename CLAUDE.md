@AGENTS.md

# iseep — GTM Intelligence System

B2B GTM intelligence platform (NOT a CRM), designed as multi-tenant SaaS. MVP on Vercel + Supabase.

**Core hierarchy:** Company (workspace) → Products → ICPs → Cases.

## Tech Stack

- **Framework:** Next.js 16 App Router — uses `proxy.ts` instead of `middleware.ts`
- **Language:** TypeScript strict; **import Zod from `zod/v4`** (not `zod`)
- **Styling:** Tailwind v4 + shadcn/ui (base-nova, neutral)
- **DB:** Supabase Postgres + Drizzle ORM (`src/db/schema.ts`, migrations in `drizzle/migrations/`)
- **AI:** Anthropic Claude (default) / OpenAI (BYOK) via `src/lib/ai-client.ts`
- **Forms:** React Hook Form + Zod v4
- **Tables:** TanStack Table; **State:** Zustand only when needed
- **Package manager:** pnpm

## Commands

- `pnpm dev` / `pnpm build` / `pnpm lint`
- `pnpm drizzle-kit generate` — generate migration from schema
- `pnpm drizzle-kit push` — push schema to DB
- `pnpm db:seed`

## Architecture

- Route groups: `(auth)` for sign-in/sign-up, `(app)` for authenticated routes
- Auth via Supabase SSR — `proxy.ts` refreshes sessions and protects routes
- **Server actions in `src/actions/` for ALL mutations** (exception: `POST /api/drafts` for external agents)
- All tables scoped by `workspace_id` for multi-tenancy
- DB client tuned for Vercel serverless + Supabase pooler (`src/db/index.ts`, **max 5 connections**)
- **Dynamic route params are `Promise<{ id: string }>` in Next.js 16 — must `await`**
- Heavy pages use `Promise.all` for parallel queries; `loading.tsx` skeletons everywhere; product switching is client-side

## Core Data Model

Schema in `src/db/schema.ts` (~32 tables). High-level entities:

- **`workspaces`** — company/tenant root. Holds company info (name, website, companyDescription, targetCustomers, industriesFocus[], geoFocus[]), `onboardingStep`, `profileShareToken`/`profileShareMode`/`profileSharedIcpIds`, `apiToken`
- **`products`** — multiple per workspace (name, shortDescription, description, coreUseCases[], keyValueProps[], pricingModel, avgTicket)
- **`product_use_cases`** — per-product usage flows; unique per (productId, normalizedName)
- **`icps`** — *shared* ICP definitions. Status draft/active/archived. Versioned via `icp_snapshots`. Public sharing via `shareToken`
- **`product_icps`** — many-to-many Product↔ICP
- **`criteria`** — scoring rules per ICP. Groups `firmographic|technographic|behavioral|compliance|keyword` × intents `qualify` (positive, weighted) / `risk` (penalty) / `exclude` (hard blocker, w≥7) × weight 1-10
- **`personas`** — buyer personas with decision context (goals, painPoints, triggers, decisionCriteria, objections, desiredOutcome)
- **`hypotheses`** — GTM angles linking `selectedCriteriaIds`/`selectedPersonaIds`/`selectedSignalIds` + `productIds[]` + problem/solution/outcome + status + outreach metrics (recipients, positiveReplies, sqls, wonDeals, lostDeals)
- **`icp_evidence`** — Cases (won/lost/in-progress). `productId` + `productIds[]` + `useCaseIds[]` + `hypothesisId` + `dealValue` + `dealType` + `whyWon`/`whyLost` + `channel` + `reasonTags[]`
- **`scored_uploads`** + **`scored_leads`** — CSV scoring batches; `fitScore` (0-100), `fitLevel`, `confidence`, `matchReasons` (JSONB)
- **`drafts`** — AI-proposed changes. 4 target types: `create_icp`, `update_product`, `update_icp`, `create_segment`. Status pending/applied/rejected
- **Config & learning:** `ai_keys`, `ai_usage`, `value_mappings`, `rejected_icps`
- **Auth:** `users`, `memberships` (role owner/admin/member), `invites`, `activity_events`
- **Legacy (still in DB, not actively written by current flows):** `companies`, `deals`, `deal_reasons`, `contacts`, `meeting_notes`, `product_requests`, `segments`, `product_context`. Onboarding writes to `workspaces`+`products`, NOT `product_context`.

## Scoring Engine (`src/lib/scoring.ts` + `src/lib/scoring/`)

Deterministic-first, AI-optional.

**7-step value resolution per cell:** exact → case-insensitive → taxonomy resolve → built-in synonyms → workspace memory → AI mapping → no match.

**3-intent model:**
- Qualify: weighted average → base score 0-100
- Exclude (w≥7 matched): early exit → `fitLevel="blocked"`, score=0
- Risk: -10 per match

**Fit levels:** `blocked` / `high` (≥70) / `medium` (≥40) / `low` (>0) / `risk` (riskFlags + score<50) / `none`. UI groups: High = high; Borderline = medium+low+risk; Blocked; Unmatched = none.

**Confidence** = `(dataCompleteness*0.6 + matchQuality*0.4)*100`.

**Workspace memory:** AI mappings auto-persisted to `value_mappings`; subsequent runs use them, reducing AI calls.

## Industry Taxonomy (`src/lib/taxonomy/`)

Two-level: ~25 sectors → ~350 industries. TS data files: `data.ts` (TAXONOMY + aliases + tags `payment-heavy`/`mass-payout`), `templates.ts` (attribute templates for 5 key sectors), `lookup.ts` (`resolveIndustry`, `hasTag`, `getChildren`, etc).

Hierarchical scoring: parent criterion ("Financial Services") matches all children ("FinTech"). `IndustryPicker` (searchable grouped dropdown, multi-select, custom fallback) used in ICP criteria form + product context form.

## Cluster Discovery (`src/lib/cluster-*.ts`)

Unmatched leads (`fitLevel="none"`) → grouped by industry → `evaluateCluster()` scores ICP-similarity + product-fit (uses taxonomy tags). User adopts (creates ICP, reclassifies leads to fitScore=80) or rejects (industry added to `excludedIndustries`, future evals return "none").

## BYOK / API / MCP

- **BYOK at `/settings/ai`:** user key (Anthropic/OpenAI) → fallback to platform Anthropic key. Limits: 20 ops/month platform, unlimited user. Defaults: `claude-sonnet-4-20250514` / `gpt-4o`. **Keys masked on server before RSC payload.**
- **API token at `/settings/ai`:** one per workspace, plain text in MVP (P0: encrypt before launch).
- **API endpoints (bearer auth via `src/lib/api-auth.ts`):** `GET /api/context`, `GET /api/icps`, `GET /api/scoring/latest`, `POST /api/drafts`.
- **MCP server** in `mcp-server/` — 4 tools (`get_context`, `list_icps`, `get_scoring_results`, `submit_suggestions`) over the same API.

## Onboarding

`workspaces.onboardingStep` integer (0=not started, 1-2=in progress, 3+=done; existing workspaces default 4 to skip). Fullscreen wizard while step<3. Steps: **Context** (paste free text → AI parse) → **Clarify** (questions + hint suggestions) → **Reveal** (profile + ACTIVE ICPs + share link).

`onboarding-parser.ts`: `parseOnboardingContext`, `refineOnboardingContext`. Writes to `workspaces` + `products` + `product_icps`. ICPs created as ACTIVE (not draft); 3-5 ICPs per industry vertical, never one generic. Browser back: `pushState` per step + `popstate` listener calls `goBackOnboarding`.

## Navigation & Routes

**Sidebar:** Dashboard / Products & ICPs / Score Leads / Settings.

- `/icps` — main workspace: Company block (inline edit) + Product selector chips + Product context block (inline edit + use cases) + ICP list filtered client-side by selected product.
- `/icps/[id]?product=X` — **shared ICPs always need `?product=` to scope cases & use cases.** Product switcher chips on the detail page swap the param.
- `/settings/{ai,team}`. `/settings/product` redirects to `/icps`.

**Public (no auth):** `/share/[token]` (ICP), `/share/company/[token]`, `/share/company/[token]/[icpId]`.

**Hidden but routes/tables still exist:** `/deals`, `/companies`, `/requests`, `/insights`, `/segments` (and their tables) — replaced by Cases + Hypotheses, removed from sidebar.

## Conventions (non-obvious invariants)

### Next.js 16 / Tooling
- `proxy.ts` (NOT `middleware.ts`)
- Dynamic route params are `Promise<{id}>` — must `await`
- Import Zod from `zod/v4` (not `zod`)
- Use shadcn/ui for all UI; Dialog base width is `sm:max-w-md` (was `sm:max-w-sm` — caused button overflow)

### Auth & Security
- Pages auth via `createClient()` from `@/lib/supabase/server`
- `getAuthContext()` returns workspaceId + userId + role; `canManageTeam(role)` for permission checks
- Workspace switcher: `activeWorkspaceId` cookie
- **Raw API keys NEVER sent to client** — mask on server before RSC payload

### Multi-product Architecture
- Company info on `workspaces` (NOT on legacy `product_context`)
- Product info on `products` (multiple per workspace)
- ICPs many-to-many via `product_icps`; can be shared, duplicated, or forked per product
- Cases (`icp_evidence.productId`) + use cases (`product_use_cases`) are product-scoped
- `linkedProductIds` built via separate `product_icps` query + Map merge on server (Drizzle sql subquery unreliable for RSC serialization — workaround)
- Shared ICP edit (productCount > 1) shows warning interstitial + "Duplicate for this product" option
- Safe ICP product unlink: blocked if any hypothesis OR case uses that product (amber warning + View links)
- ICP detail page fetches ALL cases (not product-filtered); filtering happens client-side in `icp-tabs.tsx`

### ICP Signals (UI vs DB naming)
- UI says "signal", DB stays `criteria` — mapping is UI-only, no schema changes
- Strength labels: weight ≥8 = Strong, 4-7 = Medium, ≤3 = Weak (`weightToStrength`/`strengthToWeight` in `src/lib/constants.ts`)
- Add Signal modal is 2-step (picker → configure) — picker NEVER bypassed for new signals, only skipped when editing
- Order in modal: strength Weak→Medium→Strong; intent Not a fit→Risk→Good fit
- Business model values: multi-select preset chips, stored as comma-separated string in `criteria.value`
- Industry values: `IndustryPicker` (taxonomy-backed) replaces text input
- Removed UI patterns: "=" syntax, raw weight numbers, category grouping on main ICP page

### Hypotheses & Cases
- Chip-based selection of `criteriaIds`/`personaIds`/`signalIds` from current ICP
- `productIds[]` on both — must subset of ICP's productIds; preselect current product tab on create
- **Hypothesis ↔ Case product matching is intersection-based (≥1 shared product)**, NOT exact — partial overlap is valid; only zero overlap blocks save. Hypothesis product removal is NOT blocked by linked cases (partial overlap valid per spec).
- Hypothesis metric inputs: string-state controlled with `placeholder="0"` (avoids leading-zero issue)
- `fmtPct()` — up to 2 decimal places, strips trailing zeros (`parseFloat(pct.toFixed(2))`)
- Deal types: MRR / One-time / All time / LTV estimated (no "Other")
- Cases use `useCaseIds` (jsonb array), NOT legacy `useCaseId` (single FK kept for back-compat)
- `findRelatedCases()` matches by normalized company name across products → "Reuse as draft" prefills safe fields, does NOT copy use cases/channel
- `channel="other"` hidden in display; shows `channelDetail` only

### Drafts System (Claude → iseep)
- 4 target types: `create_icp`, `update_product`, `update_icp` (matches existing criteria/personas by value, not UUID), `create_segment`
- Apply logic in `src/lib/drafts/apply.ts`. ICP update bumps version + creates snapshot; Product update merges only provided fields
- Per-type Zod payload schemas in `src/lib/drafts/types.ts`

### Performance
- DB pool max 5 connections
- All heavy pages use `Promise.all` for parallel queries
- `loading.tsx` skeletons on all main routes
- Product switching is client-side (instant, no server roundtrip)

## Known Gaps

**P0 — Security:** Encrypt AI keys + API tokens (plain text in MVP, must encrypt before production).

**P2/P3:** persistent nudge dismissal (currently resets on reload), inline draft editing, batch approve drafts, segment auto-discovery (Level 2), Resend email integration (invites create DB rows but don't send mail), batch scoring DB inserts, token-limit enforcement, drop legacy `product_context` table after confirming no readers.
