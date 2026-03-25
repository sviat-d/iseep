# Industry Taxonomy System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace freeform industry strings with a structured two-level taxonomy (sectors → industries) with aliases, attribute templates, hierarchical scoring, and a searchable picker UI.

**Architecture:** Taxonomy data lives in TypeScript files (no DB changes). Lookup module builds in-memory indexes on import. Scoring pipeline gets a new taxonomy resolve step before existing synonyms. Industry picker component replaces freeform text inputs.

**Tech Stack:** TypeScript, Next.js 16 App Router, shadcn/ui (Popover + Command/cmdk), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-25-industry-taxonomy-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/taxonomy/data.ts` | Types (`CriteriaGroup`, `IndustryNode`, `IndustrySector`) + `TAXONOMY` array (~350 entries across ~25 sectors) |
| `src/lib/taxonomy/templates.ts` | `AttributeTemplate` type + `ATTRIBUTE_TEMPLATES` array for 5 key sectors (~50 industries) |
| `src/lib/taxonomy/lookup.ts` | Index maps (`byId`, `byAlias`, `childrenOf`) + functions: `resolveIndustry`, `getChildren`, `getParent`, `isChildOf`, `searchIndustries`, `getTemplates`, `hasTag` |
| `src/components/shared/industry-picker.tsx` | Searchable grouped picker — single + multi-select, custom fallback, shadcn Popover+Command |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/scoring/normalize.ts` | Add `"taxonomy"` and `"taxonomy_parent"` to `MatchType`. Replace `INDUSTRY_SYNONYMS` lookup with `resolveIndustry()` call. Delete `INDUSTRY_SYNONYMS`. Remove `"industry"` case from `getSynonyms()`. |
| `src/lib/scoring.ts` | In `matchesCriterion()`: after exact match block (line 102-112), add hierarchical check via `isChildOf()` when `category === "industry"`. In `scoreLeadAgainstIcp()`: add `"taxonomy"` and `"taxonomy_parent"` to confidence quality check (line 232-238). |
| `src/lib/cluster-evaluation.ts` | Replace `PAYMENT_HEAVY_INDUSTRIES` and `MASS_PAYOUT_INDUSTRIES` Sets with `hasTag()` calls. Re-key `INDUSTRY_NEED_SIGNALS` by taxonomy id. Delete hardcoded Sets. |
| `src/components/criteria/criterion-form-dialog.tsx` | When `resolvedCategory === "industry"`, render `IndustryPicker` instead of `<Input>` for value field. |
| `src/components/settings/product-context-form.tsx` | Replace `industriesFocus` `<Input>` with `IndustryPicker` (multiple=true). |

---

### Task 1: Taxonomy Data — Types and Initial Seed

**Files:**
- Create: `src/lib/taxonomy/data.ts`

This is the foundation — types and the full taxonomy array. The data file is large (~1000 lines) but is pure data with no logic.

- [ ] **Step 1: Create types and sector skeleton**

Create `src/lib/taxonomy/data.ts` with:

```typescript
/** Must match the DB enum in schema.ts criteria.group */
export type CriteriaGroup =
  | "firmographic"
  | "technographic"
  | "behavioral"
  | "compliance"
  | "keyword";

export type IndustryNode = {
  id: string; // slug: "neobanking"
  name: string; // display: "Neobanking"
  parentId: string | null; // null = top-level sector
  aliases: string[]; // ["neobank", "neo-bank", "digital bank"]
  clayMappings: string[]; // Clay values that resolve here
  tags?: string[]; // ["payment-heavy", "mass-payout"]
};

export type IndustrySector = IndustryNode & {
  parentId: null;
};
```

Then define the full `TAXONOMY` array. Start with all ~25 sectors (parentId: null), then populate children for each sector.

**Critical rules for populating data:**
- Every entry needs a unique `id` (slug). Use lowercase-kebab-case.
- `aliases` must include all common variations, lowercased. Migrate all entries from the existing `INDUSTRY_SYNONYMS` in `src/lib/scoring/normalize.ts` (lines 29-59) as aliases on the correct child nodes.
- `clayMappings` should include the original Clay value when it differs from the canonical name. Use the Clay list from the spec (Section 12). Deduplicate similar Clay entries (e.g., "Biotechnology" + "Biotechnology Research" → single "Biotechnology" child).
- Tag industries with `"payment-heavy"` and `"mass-payout"` — migrate from `PAYMENT_HEAVY_INDUSTRIES` (17 entries) and `MASS_PAYOUT_INDUSTRIES` (12 entries) in `src/lib/cluster-evaluation.ts` (lines 17-31).
- The 5 sectors with attribute templates (Financial Services, Technology, Gaming & Betting, E-commerce & Marketplaces, Creator & Gig Economy) need the most detailed children.

**Reference files to read:**
- `src/lib/scoring/normalize.ts:29-59` — existing INDUSTRY_SYNONYMS to migrate as aliases
- `src/lib/cluster-evaluation.ts:17-31` — existing PAYMENT_HEAVY_INDUSTRIES and MASS_PAYOUT_INDUSTRIES to migrate as tags
- Spec Section 4 — sector table with example children

- [ ] **Step 2: Verify data integrity**

Run: `pnpm build`

Expected: Build succeeds — the file is pure data with no imports.

- [ ] **Step 3: Commit**

```bash
git add src/lib/taxonomy/data.ts
git commit -m "feat(taxonomy): add industry taxonomy data with ~350 entries across 25 sectors"
```

---

### Task 2: Attribute Templates

**Files:**
- Create: `src/lib/taxonomy/templates.ts`

- [ ] **Step 1: Create templates file**

Create `src/lib/taxonomy/templates.ts` with the `AttributeTemplate` type and templates for ~50 industries across 5 sectors.

```typescript
import type { CriteriaGroup } from "./data";

export type AttributeTemplate = {
  industryId: string; // must match an id in TAXONOMY
  category: string; // maps to criteria.category
  label: string; // human-readable label for UI
  group: CriteriaGroup; // criteria group
  suggestedValues: string[]; // clickable suggestions
};

export const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  // === Financial Services ===

  // Neobanking
  {
    industryId: "neobanking",
    category: "license_type",
    label: "License Type",
    group: "compliance",
    suggestedValues: ["Partner/BaaS", "Own EMI License", "Banking License"],
  },
  {
    industryId: "neobanking",
    category: "products",
    label: "Products",
    group: "technographic",
    suggestedValues: [
      "Cards",
      "On/Off Ramp",
      "Local Rails",
      "IBAN",
      "Virtual Accounts",
    ],
  },
  {
    industryId: "neobanking",
    category: "target_market",
    label: "Target Market",
    group: "firmographic",
    suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA"],
  },
  // ... continue for all ~50 industries with templates across 5 sectors:
  // Financial Services: FinTech, Neobanking, Payment Processing, Banking, Insurance,
  //   Lending, Crypto/Blockchain, Investment Banking, RegTech, InsurTech, WealthTech
  // Technology: SaaS, Cybersecurity, AI/ML, Cloud Infrastructure, DevTools
  // Gaming & Betting: iGaming, Online Casinos, Sports Betting, Esports
  // E-commerce & Marketplaces: E-commerce Platforms, Marketplaces, Affiliate Networks, D2C, Dropshipping
  // Creator & Gig Economy: Creator Platforms, Freelance Marketplaces, Gig Platforms
];
```

**Important:** Each template's `industryId` must exactly match an `id` from `TAXONOMY` in `data.ts`. Cross-reference when creating.

Use realistic attributes relevant to each industry vertical. Focus on attributes that help differentiate sub-segments (the whole point of this feature).

- [ ] **Step 2: Verify build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/taxonomy/templates.ts
git commit -m "feat(taxonomy): add attribute templates for 5 key sectors"
```

---

### Task 3: Lookup Module

**Files:**
- Create: `src/lib/taxonomy/lookup.ts`

This is the core logic module — indexes, resolution, search, hierarchy checks.

- [ ] **Step 1: Create lookup module with index maps and all functions**

Create `src/lib/taxonomy/lookup.ts`:

```typescript
import { TAXONOMY, type IndustryNode } from "./data";
import { ATTRIBUTE_TEMPLATES, type AttributeTemplate } from "./templates";
import { normalizeValue } from "@/lib/scoring/normalize";

// ─── Build indexes on module load ───────────────────────────────────────────

const byId = new Map<string, IndustryNode>();
const byAlias = new Map<string, IndustryNode>();
const childrenOf = new Map<string, IndustryNode[]>();

for (const node of TAXONOMY) {
  byId.set(node.id, node);

  // Index children under their parent
  if (node.parentId) {
    const siblings = childrenOf.get(node.parentId) ?? [];
    siblings.push(node);
    childrenOf.set(node.parentId, siblings);
  }

  // Build alias index — name + aliases + clayMappings, all lowercased+normalized
  // Ordered sectors-first in TAXONOMY, so child aliases override parent aliases (last-write wins)
  const allAliases = [
    node.name,
    ...node.aliases,
    ...node.clayMappings,
  ];
  for (const alias of allAliases) {
    const key = normalizeValue(alias).toLowerCase();
    if (key) byAlias.set(key, node);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Resolve raw string to canonical IndustryNode via name, aliases, or clayMappings */
export function resolveIndustry(raw: string): IndustryNode | null {
  const key = normalizeValue(raw).toLowerCase();
  return byAlias.get(key) ?? null;
}

/** Get all children of a sector */
export function getChildren(parentId: string): IndustryNode[] {
  return childrenOf.get(parentId) ?? [];
}

/** Get parent sector for a child industry */
export function getParent(industryId: string): IndustryNode | null {
  const node = byId.get(industryId);
  if (!node?.parentId) return null;
  return byId.get(node.parentId) ?? null;
}

/** Check if childValue is a descendant of parentValue in taxonomy.
 *  Uses recursive parent traversal to support arbitrary depth. */
export function isChildOf(childValue: string, parentValue: string): boolean {
  const childNode = resolveIndustry(childValue);
  const parentNode = resolveIndustry(parentValue);
  if (!childNode || !parentNode) return false;
  if (childNode.id === parentNode.id) return false; // same node is not a child of itself

  let current = childNode;
  while (current.parentId) {
    if (current.parentId === parentNode.id) return true;
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return false;
}

/** Search taxonomy by query.
 *  Ranking: name prefix > alias prefix > name substring > alias substring.
 *  Within each tier, sectors before children. */
export function searchIndustries(query: string): IndustryNode[] {
  if (!query.trim()) return TAXONOMY;

  const q = normalizeValue(query).toLowerCase();
  const namePrefix: IndustryNode[] = [];
  const aliasPrefix: IndustryNode[] = [];
  const nameSubstring: IndustryNode[] = [];
  const aliasSubstring: IndustryNode[] = [];
  const seen = new Set<string>();

  for (const node of TAXONOMY) {
    const nameLower = node.name.toLowerCase();

    if (nameLower.startsWith(q) && !seen.has(node.id)) {
      namePrefix.push(node);
      seen.add(node.id);
      continue;
    }

    const aliasHasPrefix = node.aliases.some((a) =>
      normalizeValue(a).toLowerCase().startsWith(q),
    );
    if (aliasHasPrefix && !seen.has(node.id)) {
      aliasPrefix.push(node);
      seen.add(node.id);
      continue;
    }

    if (nameLower.includes(q) && !seen.has(node.id)) {
      nameSubstring.push(node);
      seen.add(node.id);
      continue;
    }

    const aliasHasSubstring = node.aliases.some((a) =>
      normalizeValue(a).toLowerCase().includes(q),
    );
    if (aliasHasSubstring && !seen.has(node.id)) {
      aliasSubstring.push(node);
      seen.add(node.id);
    }
  }

  // Within each tier, sectors (parentId === null) before children
  const sortSectorsFirst = (a: IndustryNode, b: IndustryNode) => {
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    return 0;
  };

  return [
    ...namePrefix.sort(sortSectorsFirst),
    ...aliasPrefix.sort(sortSectorsFirst),
    ...nameSubstring.sort(sortSectorsFirst),
    ...aliasSubstring.sort(sortSectorsFirst),
  ];
}

/** Get attribute templates for an industry (also checks parent sector templates) */
export function getTemplates(industryId: string): AttributeTemplate[] {
  const node = byId.get(industryId);
  if (!node) return [];

  const directTemplates = ATTRIBUTE_TEMPLATES.filter(
    (t) => t.industryId === industryId,
  );

  // Also include parent sector templates if this is a child
  if (node.parentId) {
    const parentTemplates = ATTRIBUTE_TEMPLATES.filter(
      (t) => t.industryId === node.parentId,
    );
    return [...directTemplates, ...parentTemplates];
  }

  return directTemplates;
}

/** Check if resolved industry has a given tag.
 *  Accepts raw string — calls resolveIndustry internally. */
export function hasTag(rawValue: string, tag: string): boolean {
  const node = resolveIndustry(rawValue);
  return node?.tags?.includes(tag) ?? false;
}

/** Get all sectors (top-level nodes) */
export function getSectors(): IndustryNode[] {
  return TAXONOMY.filter((n) => n.parentId === null);
}

/** Get node by id */
export function getById(id: string): IndustryNode | null {
  return byId.get(id) ?? null;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

Expected: Build succeeds. The module imports `normalizeValue` from `@/lib/scoring/normalize` — make sure this import path resolves.

- [ ] **Step 3: Commit**

```bash
git add src/lib/taxonomy/lookup.ts
git commit -m "feat(taxonomy): add lookup module with indexes, resolution, hierarchy, search"
```

---

### Task 4: Scoring Pipeline Integration

**Files:**
- Modify: `src/lib/scoring/normalize.ts`
- Modify: `src/lib/scoring.ts`

- [ ] **Step 1: Update MatchType and resolveValue in normalize.ts**

In `src/lib/scoring/normalize.ts`:

1. Add `"taxonomy"` and `"taxonomy_parent"` to the `MatchType` union (line 108-114):

```typescript
export type MatchType =
  | "exact"
  | "case_insensitive"
  | "taxonomy"
  | "taxonomy_parent"
  | "synonym"
  | "workspace_memory"
  | "ai_mapped"
  | "none";
```

2. Delete the entire `INDUSTRY_SYNONYMS` constant (lines 29-59).

3. Remove the `"industry"` case from `getSynonyms()` (lines 95-96). The switch becomes:

```typescript
function getSynonyms(category: string): Record<string, string> {
  switch (category) {
    case "country":
    case "region":
      return COUNTRY_SYNONYMS;
    case "platform":
    case "tech_stack":
    case "payment_method":
      return PLATFORM_SYNONYMS;
    case "contact_title":
      return TITLE_SYNONYMS;
    default:
      return {};
  }
}
```

4. In `resolveValue()`, after step 2 (case-insensitive match, line 140) and before step 3 (synonym match, line 142), add taxonomy resolve:

```typescript
  // 3. Taxonomy resolve (industry category only)
  if (category === "industry") {
    const { resolveIndustry } = await import("@/lib/taxonomy/lookup");
    const node = resolveIndustry(rawValue);
    if (node) {
      const inIcp = icpValues.find(
        (v) => v.toLowerCase() === node.name.toLowerCase(),
      );
      if (inIcp) return { resolved: inIcp, matchType: "taxonomy" };
      return { resolved: node.name, matchType: "taxonomy" };
    }
  }

  // 4. Built-in synonym match (non-industry categories)
```

**Note:** Use dynamic import to avoid circular dependency (taxonomy/lookup imports normalizeValue from this file). Alternatively, if dynamic import causes issues in the sync function, import at top level and ensure no circular dependency exists (lookup.ts imports `normalizeValue` which doesn't import from taxonomy — so top-level import should work fine). Prefer top-level import:

```typescript
import { resolveIndustry } from "@/lib/taxonomy/lookup";
```

Add this at the top of the file. Then in step 3:

```typescript
  // 3. Taxonomy resolve (industry category only)
  if (category === "industry") {
    const node = resolveIndustry(rawValue);
    if (node) {
      const inIcp = icpValues.find(
        (v) => v.toLowerCase() === node.name.toLowerCase(),
      );
      if (inIcp) return { resolved: inIcp, matchType: "taxonomy" };
      return { resolved: node.name, matchType: "taxonomy" };
    }
  }
```

- [ ] **Step 2: Add hierarchical matching and confidence update in scoring.ts**

In `src/lib/scoring.ts`:

1. Add import at top:

```typescript
import { isChildOf } from "@/lib/taxonomy/lookup";
```

2. In `matchesCriterion()` (line 59-113), after the exact matching block (lines 102-112), before the `return`, add hierarchical check:

```typescript
  // Exact matching (with resolved value)
  const criterionValues = criterion.value
    .split(",")
    .map((v) => normalizeValue(v).toLowerCase());
  const resolvedLower = resolved.toLowerCase();
  const matched = criterionValues.some((cv) => cv === resolvedLower);

  // Hierarchical matching for industry criteria
  if (!matched && criterion.category === "industry") {
    const criterionRawValues = criterion.value.split(",").map((v) => v.trim());
    const isChild = criterionRawValues.some((cv) => isChildOf(resolved, cv));
    if (isChild) {
      return {
        matched: true,
        matchType: "taxonomy_parent",
        resolvedValue: resolved,
      };
    }
  }

  return {
    matched,
    matchType: matched ? matchType : "none",
    resolvedValue: resolved,
  };
```

3. In `scoreLeadAgainstIcp()`, update the confidence quality check (lines 232-238):

```typescript
      if (
        matchType === "exact" ||
        matchType === "case_insensitive" ||
        matchType === "synonym" ||
        matchType === "taxonomy" ||
        matchType === "taxonomy_parent"
      ) {
        exactOrSynonymCount++;
      }
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

Expected: Build succeeds. Check that the import chain is not circular: `scoring.ts` → `normalize.ts` → `taxonomy/lookup.ts` → `normalize.ts` (only imports `normalizeValue`, no circular issue since `normalizeValue` doesn't import from taxonomy).

- [ ] **Step 4: Commit**

```bash
git add src/lib/scoring/normalize.ts src/lib/scoring.ts
git commit -m "feat(taxonomy): integrate taxonomy resolve and hierarchical matching into scoring pipeline"
```

---

### Task 5: Cluster Evaluation Migration

**Files:**
- Modify: `src/lib/cluster-evaluation.ts`

- [ ] **Step 1: Replace hardcoded industry lists with taxonomy lookups**

In `src/lib/cluster-evaluation.ts`:

1. Add import at top:

```typescript
import { resolveIndustry, hasTag } from "@/lib/taxonomy/lookup";
```

2. Delete `PAYMENT_HEAVY_INDUSTRIES` Set (lines 17-23).

3. Delete `MASS_PAYOUT_INDUSTRIES` Set (lines 26-31).

4. Re-key `INDUSTRY_NEED_SIGNALS` (lines 43-60) by taxonomy id. Collapse duplicates:

```typescript
const INDUSTRY_NEED_SIGNALS: Record<string, string[]> = {
  "creator-economy": ["mass payouts to creators", "cross-border payments", "multi-currency disbursements"],
  "affiliate-networks": ["mass commission payouts", "partner payments at scale", "cross-border settlements"],
  "igaming": ["player withdrawals", "mass payouts", "multi-currency processing", "high-risk payment processing"],
  "gambling": ["player withdrawals", "mass payouts", "regulatory compliance for payments"],
  "sports-betting": ["mass payouts", "fast withdrawals", "multi-currency"],
  "e-commerce": ["merchant settlements", "cross-border payments", "multi-currency checkout"],
  "marketplace": ["seller payouts", "escrow", "split payments", "mass disbursements"],
  "fintech": ["payment infrastructure", "API integrations", "compliance"],
  "saas": ["subscription billing", "recurring payments", "usage-based billing"],
  "payroll": ["mass salary payments", "cross-border payroll", "multi-currency disbursements"],
  "crypto": ["fiat on/off ramps", "crypto settlements", "stablecoin payments"],
  "lending": ["loan disbursements", "repayment processing", "collections"],
  "freelance-marketplaces": ["freelancer payouts", "cross-border payments", "multi-currency"],
};
```

**Note:** The exact keys must match `id` values in `TAXONOMY` from `data.ts`. Cross-reference carefully.

5. Replace `PAYMENT_HEAVY_INDUSTRIES.has(clusterLower)` (line 175) with:

```typescript
hasTag(clusterIndustry, "payment-heavy")
```

6. Replace `MASS_PAYOUT_INDUSTRIES.has(clusterLower)` (line 186) with:

```typescript
hasTag(clusterIndustry, "mass-payout")
```

7. Replace `INDUSTRY_NEED_SIGNALS[clusterLower]` lookups (lines 188, 197) with:

```typescript
const resolvedNode = resolveIndustry(clusterIndustry);
const needSignals = resolvedNode ? INDUSTRY_NEED_SIGNALS[resolvedNode.id] : undefined;
```

Do this once near the top of the product fit section and reuse `resolvedNode` / `needSignals` throughout.

8. For the ICP similarity industry match (line 114), use taxonomy-aware comparison. Replace:

```typescript
if (industryValues.some((v) => v.includes(clusterLower) || clusterLower.includes(v))) {
```

with:

```typescript
const resolvedCluster = resolveIndustry(clusterIndustry);
const clusterCanonical = resolvedCluster?.name.toLowerCase() ?? clusterLower;
if (industryValues.some((v) => v.includes(clusterCanonical) || clusterCanonical.includes(v))) {
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/cluster-evaluation.ts
git commit -m "feat(taxonomy): replace hardcoded industry lists with taxonomy tag lookups in cluster evaluation"
```

---

### Task 6: Industry Picker Component

**Files:**
- Create: `src/components/shared/industry-picker.tsx`

**Reference:** Check what shadcn/ui components are available — this uses Popover + Command pattern. Read existing components that use this pattern if any.

- [ ] **Step 1: Check available shadcn components**

Run: `ls src/components/ui/` and look for `popover.tsx`, `command.tsx`. If either is missing, install:

```bash
pnpm dlx shadcn@latest add popover command
```

- [ ] **Step 2: Create IndustryPicker component**

Create `src/components/shared/industry-picker.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  getSectors,
  getChildren,
  searchIndustries,
  resolveIndustry,
} from "@/lib/taxonomy/lookup";

type IndustryPickerProps = {
  value: string;
  onChange: (value: string) => void;
  allowParent?: boolean;
  multiple?: boolean;
  placeholder?: string;
};

export function IndustryPicker({
  value,
  onChange,
  allowParent = true,
  multiple = false,
  placeholder = "Select industry...",
}: IndustryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Parse current values (comma-separated for multiple)
  const selectedValues = useMemo(() => {
    if (!value) return [];
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }, [value]);

  // Search results or full tree
  const sectors = useMemo(() => getSectors(), []);
  const filteredNodes = useMemo(
    () => (search ? searchIndustries(search) : []),
    [search],
  );

  function handleSelect(name: string) {
    if (multiple) {
      const exists = selectedValues.some(
        (v) => v.toLowerCase() === name.toLowerCase(),
      );
      let next: string[];
      if (exists) {
        next = selectedValues.filter(
          (v) => v.toLowerCase() !== name.toLowerCase(),
        );
      } else {
        next = [...selectedValues, name];
      }
      onChange(next.join(", "));
    } else {
      onChange(name);
      setOpen(false);
    }
  }

  function handleRemove(name: string) {
    const next = selectedValues.filter(
      (v) => v.toLowerCase() !== name.toLowerCase(),
    );
    onChange(next.join(", "));
  }

  function handleCustom() {
    if (search.trim()) {
      handleSelect(search.trim());
      setSearch("");
    }
  }

  const isSelected = (name: string) =>
    selectedValues.some((v) => v.toLowerCase() === name.toLowerCase());

  // Display value for trigger
  const displayValue = multiple
    ? null // multi shows badges below
    : value || null;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {displayValue ? (
              <span className="truncate">{displayValue}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search industries..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {search.trim() ? (
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={handleCustom}
                  >
                    Add custom: &quot;{search.trim()}&quot;
                  </button>
                ) : (
                  "No industries found."
                )}
              </CommandEmpty>

              {search ? (
                // Search results — flat list grouped by parent
                <CommandGroup>
                  {filteredNodes.map((node) => (
                    <CommandItem
                      key={node.id}
                      value={node.id}
                      onSelect={() => handleSelect(node.name)}
                      disabled={!allowParent && node.parentId === null}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${isSelected(node.name) ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className={node.parentId === null ? "font-semibold" : ""}>
                        {node.name}
                      </span>
                      {node.parentId === null && (
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          Sector
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                // Full tree — grouped by sector
                sectors.map((sector) => {
                  const children = getChildren(sector.id);
                  return (
                    <CommandGroup key={sector.id} heading={sector.name}>
                      {allowParent && (
                        <CommandItem
                          value={`sector-${sector.id}`}
                          onSelect={() => handleSelect(sector.name)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${isSelected(sector.name) ? "opacity-100" : "opacity-0"}`}
                          />
                          <span className="font-semibold">
                            All {sector.name}
                          </span>
                        </CommandItem>
                      )}
                      {children.map((child) => (
                        <CommandItem
                          key={child.id}
                          value={child.id}
                          onSelect={() => handleSelect(child.name)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${isSelected(child.name) ? "opacity-100" : "opacity-0"}`}
                          />
                          {child.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Multi-select: show selected as badges */}
      {multiple && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">
              {v}
              <button
                type="button"
                className="ml-1 hover:text-destructive"
                onClick={() => handleRemove(v)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/industry-picker.tsx
git commit -m "feat(taxonomy): add IndustryPicker component with search, hierarchy, multi-select"
```

---

### Task 7: Integrate Picker into Criteria Form

**Files:**
- Modify: `src/components/criteria/criterion-form-dialog.tsx`

- [ ] **Step 1: Replace value Input with IndustryPicker when category is industry**

In `src/components/criteria/criterion-form-dialog.tsx`:

1. Add import:

```typescript
import { IndustryPicker } from "@/components/shared/industry-picker";
```

2. Add state for the value field (needed because IndustryPicker is controlled). After the existing state declarations (around line 92-97), add:

```typescript
const [industryValue, setIndustryValue] = useState(defaultValues?.value ?? "");
```

And update it in the useEffect (around line 100-106):

```typescript
setIndustryValue(defaultValues?.value ?? "");
```

3. Replace the value input section (lines 241-260). Change from the current `<Input>` to conditional rendering:

```tsx
          {/* 3. Value */}
          <div className="space-y-2">
            <Label htmlFor="crit-value">Value</Label>
            {resolvedCategory === "industry" ? (
              <>
                <input type="hidden" name="value" value={industryValue} />
                <IndustryPicker
                  value={industryValue}
                  onChange={setIndustryValue}
                  placeholder="Search industries..."
                />
              </>
            ) : (
              <>
                <Input
                  id="crit-value"
                  name="value"
                  placeholder={
                    intent === "qualify"
                      ? "e.g. FinTech, iGaming, EU"
                      : intent === "risk"
                        ? "e.g. UK, USA"
                        : "e.g. sanctioned jurisdictions"
                  }
                  defaultValue={defaultValues?.value ?? ""}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple values with commas.
                </p>
              </>
            )}
          </div>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Manual test**

Run: `pnpm dev`

Navigate to any ICP detail page → click "Add Rule" → select "Industry" as property → verify the value field shows the IndustryPicker instead of a plain text input. Search for "fin" and verify FinTech appears. Select it, submit the form.

- [ ] **Step 4: Commit**

```bash
git add src/components/criteria/criterion-form-dialog.tsx
git commit -m "feat(taxonomy): use IndustryPicker in criterion form when category is industry"
```

---

### Task 8: Integrate Picker into Product Context Form

**Files:**
- Modify: `src/components/settings/product-context-form.tsx`

- [ ] **Step 1: Replace industriesFocus Input with multi-select IndustryPicker**

In `src/components/settings/product-context-form.tsx`:

1. Add import:

```typescript
import { IndustryPicker } from "@/components/shared/industry-picker";
```

2. Add state for industriesFocus (the form uses `defaultValue` on native inputs, but IndustryPicker is controlled). Add after the useActionState declaration:

```typescript
const [industriesFocusValue, setIndustriesFocusValue] = useState(
  joinArray(defaultValues?.industriesFocus),
);
```

3. Replace the industriesFocus input section (lines 132-142):

```tsx
            <div className="space-y-2">
              <Label htmlFor="industriesFocus">Industries you focus on</Label>
              <input type="hidden" name="industriesFocus" value={industriesFocusValue} />
              <IndustryPicker
                value={industriesFocusValue}
                onChange={setIndustriesFocusValue}
                multiple
                placeholder="Select industries..."
              />
            </div>
```

Note: `useState` needs to be imported — check if it's already imported. If not, add it to the `import { useActionState } from "react"` line.

- [ ] **Step 2: Verify build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Manual test**

Run: `pnpm dev`

Navigate to `/settings/product` → verify the "Industries you focus on" field shows the IndustryPicker with multi-select badges. Add "FinTech", "iGaming" → save → reload → verify they persist.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/product-context-form.tsx
git commit -m "feat(taxonomy): use multi-select IndustryPicker for product context industries"
```

---

### Task 9: Attribute Template Suggestions in Criteria Form

**Files:**
- Modify: `src/components/criteria/criterion-form-dialog.tsx`

This adds the "Suggested criteria for {industry}" section below the industry picker.

- [ ] **Step 1: Add template suggestions UI**

In `src/components/criteria/criterion-form-dialog.tsx`:

1. Add imports:

```typescript
import { resolveIndustry, getTemplates } from "@/lib/taxonomy/lookup";
import type { AttributeTemplate } from "@/lib/taxonomy/templates";
```

2. Add a callback prop to allow adding suggested criteria from the dialog. The simplest approach: close dialog with a callback that triggers new criterion creation from the parent. However, templates are informational — they show what criteria exist for this industry.

Better approach: show templates as read-only suggestions below the industry picker. User can note them and add separately.

After the IndustryPicker inside the `resolvedCategory === "industry"` block, add:

```tsx
{resolvedCategory === "industry" && industryValue && (() => {
  const node = resolveIndustry(industryValue);
  if (!node) return null;
  const templates = getTemplates(node.id);
  if (templates.length === 0) return null;
  return (
    <div className="rounded-md border border-dashed p-2.5 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        Suggested criteria for {node.name}:
      </p>
      <div className="flex flex-wrap gap-1">
        {templates.map((t) => (
          <Badge
            key={`${t.category}-${t.suggestedValues[0]}`}
            variant="outline"
            className="text-[10px] text-muted-foreground"
          >
            {t.label}: {t.suggestedValues.slice(0, 2).join(", ")}
            {t.suggestedValues.length > 2 && "..."}
          </Badge>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Add these as separate rules after saving this one.
      </p>
    </div>
  );
})()}
```

Note: Import `Badge` if not already imported:

```typescript
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Manual test**

Run: `pnpm dev`

ICP detail → Add Rule → Industry → select "Neobanking" → verify suggested criteria badges appear below (License Type, Products, Target Market). Select an industry without templates (e.g., from Manufacturing sector) → verify no suggestions appear.

- [ ] **Step 4: Commit**

```bash
git add src/components/criteria/criterion-form-dialog.tsx
git commit -m "feat(taxonomy): show attribute template suggestions when selecting industry"
```

---

### Task 10: Final Verification and Cleanup

**Files:**
- Verify: all modified files

- [ ] **Step 1: Full build**

Run: `pnpm build`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`

Fix any lint errors introduced.

- [ ] **Step 3: Manual end-to-end test**

Run: `pnpm dev` and verify:

1. **Industry Picker in criteria form:** Add Rule → Industry → search "fintech" → select → shows canonical "FinTech". Save.
2. **Industry Picker in product context:** Settings → Product → "Industries you focus on" → multi-select → add "FinTech", "iGaming" → save → reload → persisted.
3. **Attribute suggestions:** Add Rule → Industry → select "Neobanking" → see suggestions below picker.
4. **Scoring (if test CSV available):** Upload CSV with lead industry "financial technology" → should resolve to "FinTech" via taxonomy (matchType: taxonomy). If ICP criterion is "Financial Services" and lead is "FinTech" → should match via hierarchy (matchType: taxonomy_parent).
5. **Cluster evaluation:** If cluster with industry "igaming" exists → should use taxonomy tags for payment-heavy detection instead of hardcoded set.
6. **Custom fallback:** In industry picker, type something not in taxonomy (e.g., "Quantum Computing") → "Add custom" option appears → select → value stored as freeform string.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(taxonomy): address lint and build issues from integration"
```

- [ ] **Step 5: Update CLAUDE.md**

Update `src/` related sections in `CLAUDE.md`:
- Section 17 (Industry System): change status from `[PARTIAL]` to `[IMPLEMENTED]`, update description
- Add `src/lib/taxonomy/` to file structure
- Update known gaps: remove "Industry taxonomy system" from P1

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with industry taxonomy system status"
```
