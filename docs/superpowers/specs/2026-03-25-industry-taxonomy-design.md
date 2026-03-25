# Industry Taxonomy System — Design Spec

> **Goal:** Replace freeform industry strings with a structured, hierarchical taxonomy that enables normalized matching, hierarchical scoring, and attribute-based ICP suggestions.

## 1. Problem

Industries are stored as unstructured strings across 3 tables (`companies`, `scored_leads`, `criteria`) with no normalization layer. Matching relies on 23 hardcoded synonyms in `normalize.ts` and expensive AI fallback. Users type freeform industry values when creating ICP criteria — no standard list, no hierarchy, no aliases. Clay's industry list lacks depth for B2B verticals (no FinTech, Neobanking, iGaming, Crypto, Creator Economy).

Consequences:
- CSV leads with "fintech" don't match ICP criterion "Financial Technology" without AI intervention
- No way to say "all Financial Services companies" — must add FinTech, Banking, Insurance as separate criteria
- Cluster evaluation uses hardcoded `PAYMENT_HEAVY_INDUSTRIES` (17 entries) and `MASS_PAYOUT_INDUSTRIES` (8 entries) — not configurable
- Product context `industriesFocus` accepts any string — no validation, no suggestions

## 2. Solution

A two-level industry taxonomy with aliases and attribute templates:

- **Taxonomy tree** — ~25 sectors (parents) → ~350 industries (children), stored as TypeScript data file. Read-only for users. Includes aliases for normalization and Clay mappings for import compatibility.
- **Attribute templates** — per-industry suggested criteria (e.g., "Neobanking" → suggest License Type, Products, Target Market). Pre-seeded for ~50 key industries in 5 sectors. Read-only.
- **Industry picker** — searchable grouped picker replacing freeform text input. Searches by name + aliases. Allows selecting parent (broad match) or child (exact match). Custom fallback for unlisted values.
- **Scoring integration** — new taxonomy resolve step in scoring pipeline, before existing synonyms. Hierarchical matching: parent criterion matches all children. Replaces hardcoded `INDUSTRY_SYNONYMS`.

## 3. Data Model

### Taxonomy Types

```typescript
// src/lib/taxonomy/data.ts

export type IndustryNode = {
  id: string;              // slug: "neobanking"
  name: string;            // display: "Neobanking"
  parentId: string | null; // null = top-level sector
  aliases: string[];       // ["neobank", "neo-bank", "neo bank", "digital bank"]
  clayMappings: string[];  // Clay values that resolve here: ["Financial Services"]
};

export type IndustrySector = IndustryNode & {
  parentId: null;          // sectors are top-level
};

// Full taxonomy: flat array, hierarchy via parentId
export const TAXONOMY: IndustryNode[] = [
  // Sectors (parentId: null)
  { id: "financial-services", name: "Financial Services", parentId: null, aliases: ["finance", "financial"], clayMappings: ["Financial Services", "Capital Markets"] },
  // Children (parentId: sector id)
  { id: "fintech", name: "FinTech", parentId: "financial-services", aliases: ["fintech", "financial technology", "fin tech", "fin-tech"], clayMappings: [] },
  { id: "neobanking", name: "Neobanking", parentId: "financial-services", aliases: ["neobank", "neo-bank", "neo bank", "digital bank", "challenger bank"], clayMappings: [] },
  { id: "payment-processing", name: "Payment Processing", parentId: "financial-services", aliases: ["payments", "payment gateway", "psp", "payment service provider"], clayMappings: [] },
  // ... ~350 total entries
];
```

### Attribute Templates

```typescript
// src/lib/taxonomy/templates.ts

export type AttributeTemplate = {
  industryId: string;        // "neobanking"
  category: string;          // "license_type"
  label: string;             // "License Type"
  group: CriteriaGroup;      // "firmographic" | "technographic" | etc.
  suggestedValues: string[]; // ["Partner/BaaS", "Own EMI", "Banking License"]
};

export const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  // Neobanking
  { industryId: "neobanking", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["Partner/BaaS", "Own EMI License", "Banking License"] },
  { industryId: "neobanking", category: "products", label: "Products", group: "technographic", suggestedValues: ["Cards", "On/Off Ramp", "Local Rails", "IBAN", "Virtual Accounts"] },
  { industryId: "neobanking", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA"] },
  // ... templates for ~50 industries across 5 sectors
];
```

### No Database Changes

Taxonomy lives in code. No new tables. Criteria continue to store industry as string values in `criteria.value`. The taxonomy normalizes and resolves these values at runtime.

## 4. Taxonomy Structure (Sectors)

~25 top-level sectors, ~350 children total. Clay list provides the base; missing B2B/tech verticals added manually.

| Sector | Example Children | Attribute Templates |
|--------|-----------------|-------------------|
| Financial Services | FinTech, Neobanking, Payment Processing, Banking, Insurance, Lending, Crypto/Blockchain, Investment Banking, RegTech, InsurTech, WealthTech | Yes |
| Technology | SaaS, Software Development, IT Services, Data & Analytics, Cybersecurity, AI/ML, Cloud Infrastructure, DevTools, Low-Code | Yes |
| Gaming & Betting | iGaming, Online Casinos, Sports Betting, Esports, Game Development, Fantasy Sports | Yes |
| E-commerce & Marketplaces | E-commerce Platforms, Online Retail, Marketplaces, D2C Brands, Affiliate Networks, Dropshipping | Yes |
| Creator & Gig Economy | Creator Platforms, Freelance Marketplaces, Gig Platforms, Content Monetization, Influencer Marketing | Yes |
| Media & Entertainment | Media Production, Streaming, Publishing, Social Platforms, Podcasting | No |
| Healthcare | Hospitals, MedTech, Pharma, HealthTech, Mental Health, Telemedicine | No |
| Education | EdTech, E-Learning, Higher Ed, K-12, Corporate Training | No |
| Manufacturing | ~40 children from Clay (grouped by type) | No |
| Retail | ~20 children from Clay | No |
| Wholesale | ~15 children from Clay | No |
| Real Estate | Commercial, Residential, PropTech, Property Management | No |
| Energy & Utilities | Oil & Gas, Renewables, Utilities, CleanTech, Solar, Wind | No |
| Transportation & Logistics | Freight, Warehousing, Last-mile, Maritime, Aviation | No |
| Construction | Building, Civil Engineering, Specialty Trade | No |
| Professional Services | Consulting, Legal, Accounting, HR Services, Staffing | No |
| Government & Public Sector | Gov Admin, Public Policy, Defense, Military | No |
| Non-profit | NGOs, Philanthropy, Community Services | No |
| Agriculture | Farming, Ranching, AgTech, Food Production | No |
| Hospitality & Tourism | Hotels, Restaurants, Travel, Event Planning | No |
| Telecom | Carriers, Wireless, Satellite, VoIP | No |
| Automotive | Manufacturing, EV, Mobility, Fleet Management | No |
| Fashion & Luxury | Apparel, Luxury Goods, Cosmetics, Jewelry | No |
| Food & Beverage | F&B Manufacturing, Retail, Services, Breweries | No |
| Sports & Recreation | Sports Teams, Fitness, Recreation, Outdoor | No |

Attribute templates in v1 only for first 5 sectors (~50 industries). Other sectors have tree + aliases only.

## 5. Lookup Functions

```typescript
// src/lib/taxonomy/lookup.ts

/** Resolve raw string to canonical IndustryNode via aliases, clayMappings, or name match */
export function resolveIndustry(raw: string): IndustryNode | null;

/** Get all children of a sector */
export function getChildren(parentId: string): IndustryNode[];

/** Get parent sector for a child industry */
export function getParent(industryId: string): IndustryNode | null;

/** Check if childValue is a descendant of parentValue in taxonomy */
export function isChildOf(childValue: string, parentValue: string): boolean;

/** Search taxonomy by query — matches name + aliases, returns ranked results */
export function searchIndustries(query: string): IndustryNode[];

/** Get attribute templates for an industry (also checks parent sector templates) */
export function getTemplates(industryId: string): AttributeTemplate[];
```

All lookups are O(1) or O(n) in-memory operations on the flat array. Build index maps on module load for performance:
- `byId: Map<string, IndustryNode>` — lookup by id
- `byAlias: Map<string, IndustryNode>` — lowercase alias → node (includes name, aliases, clayMappings)
- `childrenOf: Map<string, IndustryNode[]>` — parentId → children

## 6. Scoring Integration

### Modified Pipeline

Current 6-step pipeline in `resolveValue()` (`src/lib/scoring/normalize.ts`):

```
1. Exact match
2. Case-insensitive
3. Built-in synonyms (INDUSTRY_SYNONYMS)  ← REPLACED
4. Workspace memory
5. AI mapping
6. No match
```

New pipeline:

```
1. Exact match
2. Case-insensitive
3. Taxonomy resolve (alias → canonical name)  ← NEW
4. Workspace memory
5. AI mapping
6. No match
```

Step 3 changes: instead of looking up `INDUSTRY_SYNONYMS[lower]`, call `resolveIndustry(rawValue)`. If found, return `{ resolved: node.name, matchType: "taxonomy" }`.

### New MatchType

Add `"taxonomy"` and `"taxonomy_parent"` to `MatchType` union in `normalize.ts`:

```typescript
export type MatchType =
  | "exact"
  | "case_insensitive"
  | "taxonomy"           // alias resolved to canonical name
  | "taxonomy_parent"    // child matched via parent criterion
  | "synonym"            // kept for non-industry categories
  | "workspace_memory"
  | "ai_mapped"
  | "none";
```

### Hierarchical Matching

In `scoring.ts`, after resolving the lead's industry value to a canonical name, check if the ICP criterion is a parent sector:

```
Lead: "fintech" → taxonomy resolve → "FinTech" (id: fintech, parent: financial-services)
ICP criterion: "Financial Services"

1. Direct match: "FinTech" === "Financial Services"? No
2. Parent match: isChildOf("FinTech", "Financial Services")? Yes → match!
   matchType: "taxonomy_parent"
```

This only applies to `category === "industry"`. Other categories use existing pipeline unchanged.

Hierarchical match counts as full match — same weight as exact. The user intentionally chose a parent-level criterion.

### Hardcoded Lists Replacement

`PAYMENT_HEAVY_INDUSTRIES` and `MASS_PAYOUT_INDUSTRIES` in `cluster-evaluation.ts` are replaced with taxonomy-based lookups. Add optional tags to `IndustryNode`:

```typescript
export type IndustryNode = {
  id: string;
  name: string;
  parentId: string | null;
  aliases: string[];
  clayMappings: string[];
  tags?: string[];  // ["payment-heavy", "mass-payout"]
};
```

`cluster-evaluation.ts` replaces:
- `PAYMENT_HEAVY_INDUSTRIES.includes(lower)` → `hasTag(industryValue, "payment-heavy")`
- `MASS_PAYOUT_INDUSTRIES.includes(lower)` → `hasTag(industryValue, "mass-payout")`

Tags are set in taxonomy data, not by users.

## 7. Industry Picker Component

### `src/components/shared/industry-picker.tsx`

Searchable grouped dropdown replacing freeform text input for industry values.

**Props:**
```typescript
type IndustryPickerProps = {
  value: string;
  onChange: (value: string) => void;
  allowParent?: boolean;  // allow selecting sectors (default: true)
  multiple?: boolean;     // multi-select for product context (default: false)
  placeholder?: string;
};
```

**Behavior:**
- Shows sectors as group headers, children as selectable items
- Search filters by name + aliases (type "crypto" → shows "Crypto / Blockchain" under "Financial Services")
- Selecting a sector = broad matching (all children qualify)
- Selecting a child = exact matching
- Custom fallback: if no match found, show "Add custom: {query}" option — stores freeform string as before
- Built on shadcn `Popover` + `Command` (cmdk) pattern — consistent with existing UI

**Used in:**
- ICP criteria form — when category === "industry", value input becomes industry picker
- Product context form — `industriesFocus` field becomes multi-select industry picker
- Cluster review — industry display shows canonical name with parent sector badge

## 8. Attribute Template Suggestions

When user adds an industry criterion to an ICP, check for attribute templates:

**Trigger:** After adding/changing a criterion where `category === "industry"`, look up templates for the resolved industry.

**UI:** Below the industry criterion row, show a collapsible "Suggested criteria for {industry}" section with one-click add buttons:

```
💡 Suggested criteria for Neobanking:
  [+ License Type: Partner/BaaS]  [+ License Type: Own EMI]
  [+ Products: Cards]  [+ Products: On/Off Ramp]  [+ Target Market: LATAM]
```

Clicking a suggestion adds a new criterion row to the ICP form with pre-filled group, category, and value. User can modify before saving.

**No blocking:** Suggestions are informational. User can ignore them entirely.

**Scope:** Templates exist only for ~50 industries in Financial Services, Technology, Gaming & Betting, E-commerce & Marketplaces, Creator & Gig Economy. Other industries show no suggestions.

## 9. Integration with Existing Features

### Context Export
No changes. Export outputs whatever string values are in criteria. If industry value is "FinTech" (canonical), it exports as "FinTech". Taxonomy is internal resolution mechanism, not a data format change.

### Draft System
No changes to draft payloads or validation. When Claude proposes `create_icp` with `{ category: "industry", value: "fintech" }`, the value is stored as-is. Taxonomy resolution happens at scoring time, not at draft creation.

### ICP Import (AI)
No changes to AI parser. It continues to extract industry values as strings. The taxonomy picker can be used in the review step (step 2) when user edits extracted criteria.

### Cluster Evaluation
Replace hardcoded industry lists with taxonomy tag lookups. The `evaluateCluster()` function calls `resolveIndustry()` on the cluster's industry value to get the canonical name, then checks tags for payment-heavy/mass-payout signals.

`INDUSTRY_NEED_SIGNALS` in `cluster-evaluation.ts` keyed by industry name — update keys to use canonical taxonomy names.

### Industry Merge Action
`src/actions/industry.ts` `mergeIndustryValue()` remains unchanged. It operates on raw string values in DB. Taxonomy resolution is read-time, not write-time.

## 10. Backward Compatibility

- **Existing ICP criteria** with freeform industry values continue to work. If value matches a taxonomy entry (by name or alias), it gets resolved. If not, falls through to workspace memory → AI → none (same as today).
- **Existing scored leads** are not re-scored. Their `matchReasons` retain original matchType values.
- **`INDUSTRY_SYNONYMS`** in `normalize.ts` is removed — its entries are migrated to taxonomy aliases. The `getSynonyms("industry")` call returns empty, but this codepath is replaced by taxonomy resolve.
- **Non-industry synonyms** (`COUNTRY_SYNONYMS`, `PLATFORM_SYNONYMS`, `TITLE_SYNONYMS`) are unchanged.
- **Custom freeform values** still work via industry picker's "Add custom" fallback.

## 11. File Structure

### New Files

```
src/lib/taxonomy/
  data.ts         — IndustryNode type + TAXONOMY array (~1000 lines)
  templates.ts    — AttributeTemplate type + ATTRIBUTE_TEMPLATES array
  lookup.ts       — resolveIndustry, getChildren, getParent, isChildOf, searchIndustries, getTemplates, hasTag

src/components/shared/
  industry-picker.tsx  — searchable grouped picker (single + multi-select)
```

### Modified Files

```
src/lib/scoring/normalize.ts
  — Add "taxonomy" and "taxonomy_parent" to MatchType
  — Replace INDUSTRY_SYNONYMS lookup with taxonomy resolve in resolveValue()
  — Delete INDUSTRY_SYNONYMS constant

src/lib/scoring.ts
  — Add hierarchical matching: if category === "industry" and direct match fails, check isChildOf()

src/lib/cluster-evaluation.ts
  — Replace PAYMENT_HEAVY_INDUSTRIES with hasTag(value, "payment-heavy")
  — Replace MASS_PAYOUT_INDUSTRIES with hasTag(value, "mass-payout")
  — Update INDUSTRY_NEED_SIGNALS keys to canonical names

src/lib/constants.ts
  — No structural changes; industry PROPERTY_OPTIONS entry unchanged

src/components/ (ICP criteria form)
  — When category === "industry", render IndustryPicker instead of plain Input
  — Show attribute template suggestions after industry selection

src/components/settings/product-context-form.tsx
  — Replace industriesFocus text input with IndustryPicker (multiple=true)
```

## 12. Initial Data Approach

The taxonomy data file is populated by:
1. Taking the user's Clay list (~500 entries) as base
2. Deduplicating (e.g., "Biotechnology" + "Biotechnology Research" → single "Biotechnology")
3. Grouping into ~25 sectors
4. Adding missing B2B/tech verticals (FinTech, Neobanking, Payment Processing, iGaming, Crypto, Creator Economy, SaaS, PropTech, InsurTech, RegTech, etc.)
5. Adding aliases for common variations (fintech, fin-tech, financial technology, etc.)
6. Adding Clay mappings where Clay names differ from canonical names
7. Tagging payment-heavy and mass-payout industries
8. Creating attribute templates for 5 key sectors

This is done as part of implementation — the data file is authored manually with AI assistance, then reviewed by the user.

## 13. Future Extensibility

- **Third level:** If sub-industries are needed (Neobanking → Challenger Banks, Digital-Only Banks), add children to children. `isChildOf` already traverses the tree recursively.
- **Database migration:** If the taxonomy needs to be user-configurable per workspace, move `TAXONOMY` array to a `industries` table. Lookup functions become DB queries with caching.
- **Admin UI:** Web interface for adding/editing taxonomy entries. Not needed while taxonomy is code-managed.
- **Auto-tagging:** When scoring a CSV, auto-tag companies with canonical industry from taxonomy for analytics.
