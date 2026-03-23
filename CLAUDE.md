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
│   ├── (auth)/               # Auth pages (sign-in, sign-up)
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
│   │   └── settings/         # product/, ai/
│   └── share/[token]/        # Public ICP share (no auth)
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # sidebar, topbar, app-shell
│   ├── dashboard/            # dashboard-view
│   ├── icps/                 # ICP management components
│   ├── scoring/              # scoring-results, upload-wizard, cluster-review, reject-icp-dialog
│   ├── settings/             # product-context-form, ai-settings-form
│   └── shared/               # product-context-nudge, industry-input
├── actions/                  # Server actions
│   ├── scoring.ts            # processUpload, processSampleData, deleteUpload
│   ├── cluster-icp.ts        # saveClusterAsIcp (adopt cluster → create ICP + reclassify leads)
│   ├── evaluate-cluster.ts   # evaluateClusterWithAi
│   ├── reject-icp.ts         # rejectSuggestedIcp
│   ├── import-icp.ts         # parseIcpAction, confirmImportIcps
│   ├── ai-keys.ts            # saveAiKey, removeAiKey, testAiKey
│   └── product-context.ts    # saveProductContext
├── db/
│   ├── schema.ts             # Drizzle schema (22 tables)
│   ├── index.ts              # DB client (pooler-aware)
│   └── seed.ts               # Seed script
├── lib/
│   ├── auth.ts               # getAuthContext (workspace + user)
│   ├── types.ts              # ActionResult, IcpSnapshotData
│   ├── constants.ts          # GROUP_LABELS, property options
│   ├── validators.ts         # Zod schemas
│   ├── scoring.ts            # Scoring engine (scoreLeadAgainstIcp, scoreLeadAgainstAllIcps)
│   ├── scoring/
│   │   ├── normalize.ts      # Value resolution (6-step: exact → case → synonym → memory → AI → none)
│   │   └── mapping-memory.ts # Workspace value mappings (learning from AI)
│   ├── value-mapper.ts       # AI-assisted value mapping (Claude/GPT)
│   ├── ai-client.ts          # AI provider factory (Anthropic/OpenAI, BYOK)
│   ├── ai-usage.ts           # Rate limiting (20 ops/month platform, unlimited BYOK)
│   ├── icp-parser.ts         # AI text-to-ICP extraction
│   ├── cluster-draft.ts      # Generate cluster drafts from unmatched leads
│   ├── cluster-evaluation.ts # Evaluate clusters (ICP similarity + product fit)
│   ├── sample-data.ts        # 20 sample leads for demo scoring
│   ├── segment-helpers.ts    # Condition tree manipulation
│   ├── queries/              # Server-side query functions
│   ├── supabase/             # Supabase client (browser + server)
│   └── proxy.ts              # Auth proxy (replaces middleware.ts)
└── drizzle/migrations/       # SQL migrations (0000-0004)
```

## 5. Core Entities (22 Tables)

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

### Auth & Tenancy
| Table | Purpose |
|-------|---------|
| `workspaces` | Tenant root (name, slug) |
| `users` | Auth users (synced from Supabase) |
| `memberships` | User-workspace access (role: owner/admin/member) |

## 6. Scoring System [IMPLEMENTED]

### Architecture: Deterministic-First, AI-Optional

```
CSV Upload → Parse → Normalize → Score → Persist
                        ↓
              6-step value resolution:
              1. Exact match
              2. Case-insensitive
              3. Built-in synonyms (countries, industries, platforms, titles)
              4. Workspace memory (learned mappings)
              5. AI mapping (Claude/GPT) — optional, rate-limited
              6. No match
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

## 11. Industry System [PARTIAL]

**Implemented:**
- Built-in synonym dictionaries for countries (27), industries (23), platforms (8), titles (10)
- Workspace-level value mappings (learned from AI, persisted across scoring runs)
- AI-assisted fuzzy matching for unknown values
- Industry merge/replace action across workspace

**Missing:**
- No formal industry taxonomy entity/table
- No industry alias management UI
- No normalized industry hierarchy
- Synonyms are hardcoded in `normalize.ts`, not configurable

## 12. Navigation (Sidebar)

1. Dashboard (`/dashboard`)
2. Product (`/settings/product`)
3. ICPs (`/icps`)
4. Segments (`/segments`)
5. Deals (`/deals`)
6. Companies (`/companies`)
7. Requests (`/requests`)
8. Insights (`/insights`)
9. Score Leads (`/scoring`)

## 13. Routes

### Auth
| Route | Purpose |
|-------|---------|
| `/sign-in` | Login |
| `/sign-up` | Registration + workspace setup |

### App
| Route | Purpose |
|-------|---------|
| `/dashboard` | State-aware overview (empty → has ICPs → has scoring) |
| `/settings/product` | Product context form |
| `/settings/ai` | BYOK API key management |
| `/icps` | ICP list |
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
| `/deals` | Deal list |
| `/deals/new` | Create deal |
| `/deals/[id]` | Deal detail (reasons, notes, ICP links) |
| `/companies` | Company list |
| `/companies/new` | Create company |
| `/companies/[id]` | Company detail with contacts |
| `/requests` | Product requests from deals |
| `/insights` | Win/loss analytics |
| `/share/[token]` | Public ICP share (no auth) |

## 14. Current State vs Target State

| Feature | Status | Notes |
|---------|--------|-------|
| ICP management (CRUD, criteria, personas, signals) | [IMPLEMENTED] | Full CRUD with versioning, sharing |
| Scoring engine (deterministic + AI) | [IMPLEMENTED] | 6-step resolution, 3 intents, confidence |
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
| Product context as onboarding step | [MISSING] | No formal onboarding wizard |
| Product context as separate sidebar item | [IMPLEMENTED] | "Product" nav item (links to /settings/product) |
| BYOK (Anthropic + OpenAI) | [IMPLEMENTED] | Key management, test, rate limits |
| ICP import from text/file | [IMPLEMENTED] | 3-step wizard with AI parsing |
| ICP sharing (public pages) | [IMPLEMENTED] | Token-based share links, 2 modes |
| Deals with win/loss tracking | [IMPLEMENTED] | Companies, contacts, reasons, notes |
| Product requests lifecycle | [IMPLEMENTED] | 4 types, 4 statuses, linked to deals |
| Insights analytics | [IMPLEMENTED] | Win/loss patterns by ICP |
| Industry taxonomy (normalized) | [PARTIAL] | Hardcoded synonyms, no formal taxonomy UI |
| Industry alias management | [MISSING] | No UI for managing synonyms |
| Segment builder with condition logic | [IMPLEMENTED] | Flat Include/Exclude/Risk rules |
| Match explanation layer | [IMPLEMENTED] | matchReasons[] with per-criterion detail |
| AI key encryption | [MISSING] | Plain text in MVP |
| Onboarding flow | [MISSING] | No guided setup wizard |

## 15. Known Gaps (Prioritized)

### P0 — Security
1. **AI key encryption** — keys stored plain text. Must encrypt before production launch.

### P1 — Product Completeness
2. **Industry taxonomy system** — need configurable industry hierarchy with aliases, not just hardcoded synonyms
3. **Onboarding wizard** — guided flow: product context → first ICP → sample scoring
4. **Product context standalone route** — move from `/settings/product` to `/product` (own route, not settings)

### P2 — UX Polish
5. **Persistent nudge dismissal** — currently client-side only, resets on page reload
6. **Cluster AI evaluation UX** — improve loading states, error handling
7. **Segment discovery (Level 2)** — auto-generated segments from scoring patterns (beyond manual clusters)

### P3 — Scale
8. **Batch scoring optimization** — current per-lead loop, could batch DB inserts better
9. **Token tracking enforcement** — tokens logged but not enforced in limits

## 16. Conventions

- Use shadcn/ui components for all UI
- Use server actions for mutations, not API routes
- All pages use `createClient()` from `@/lib/supabase/server` for auth
- Dynamic route params are `Promise<{ id: string }>` in Next.js 16 (must await)
- Import Zod from `zod/v4` (not `zod`)
- Criteria groups: firmographic, technographic, behavioral, compliance, keyword
- Criteria intents: qualify (positive, weighted), risk (penalty), exclude (hard blocker)
- Fit levels: high, medium, low, risk, blocked, none
