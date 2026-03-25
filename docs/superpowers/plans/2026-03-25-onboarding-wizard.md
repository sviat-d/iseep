# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-step onboarding wizard (Product Context → First ICP → Sample Scoring) that replaces the dashboard empty state for new workspaces, with a simplified 4-item sidebar during onboarding.

**Architecture:** New `onboardingStep` integer field on `workspaces` tracks progress (0-4). Dashboard page conditionally renders wizard or normal dashboard. Layout passes step to sidebar for item filtering. Wizard reuses existing server actions (saveProductContext, parseIcpAction, confirmImportIcps, processSampleData).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, shadcn/ui, Tailwind CSS v4, server actions

**Spec:** `docs/superpowers/specs/2026-03-25-onboarding-wizard-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/actions/onboarding.ts` | Server actions: `advanceOnboarding`, `runOnboardingScoring`, `createDemoIcp` (internal) |
| `src/components/onboarding/onboarding-wizard.tsx` | Container: stepper + step switching based on `onboardingStep` prop |
| `src/components/onboarding/onboarding-stepper.tsx` | Horizontal progress indicator (4 steps, non-clickable) |
| `src/components/onboarding/step-product.tsx` | Simplified product context form (4 fields) |
| `src/components/onboarding/step-icp.tsx` | ICP import textarea + parse preview / manual link / skip |
| `src/components/onboarding/step-scoring.tsx` | Auto sample scoring + inline results display |
| `src/components/onboarding/step-done.tsx` | Completion screen with 2 CTA cards |

### Modified Files
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `onboardingStep` to `workspaces` table |
| `src/actions/auth.ts` | Set `onboardingStep: 0` in workspace insert during `signUp` |
| `src/app/(app)/layout.tsx` | Make async, fetch `onboardingStep`, pass to `AppShell` |
| `src/components/layout/app-shell.tsx` | Accept `onboardingStep` prop, forward to `Sidebar` |
| `src/components/layout/sidebar.tsx` | Accept `onboardingStep` prop, filter nav items when `< 4` |
| `src/app/(app)/dashboard/page.tsx` | Conditional: if `onboardingStep < 4` render wizard, else existing dashboard |

---

### Task 1: Schema + Migration + Auth Update

**Files:**
- Modify: `src/db/schema.ts:15-27`
- Modify: `src/actions/auth.ts:107-113`

- [ ] **Step 1: Add onboardingStep to workspaces schema**

In `src/db/schema.ts`, add `onboardingStep` field to the `workspaces` table definition, after the `apiToken` line (line 24):

```typescript
  onboardingStep: integer("onboarding_step").notNull().default(4),
```

Import `integer` from `drizzle-orm/pg-core` if not already imported (check existing imports at the top of the file).

- [ ] **Step 2: Run migration**

Create and run a Node.js migration script to add the column to the existing database:

```bash
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
sql\`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 4\`
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
"
```

Default is `4` (completed) so existing workspaces are unaffected.

- [ ] **Step 3: Update signUp to set onboardingStep: 0**

In `src/actions/auth.ts`, update the workspace insert (lines 107-113) to explicitly set `onboardingStep: 0`:

```typescript
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: parsed.data.workspaceName,
        slug: `${slug}-${authData.user.id.slice(0, 8)}`,
        onboardingStep: 0,
      })
      .returning();
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/actions/auth.ts
git commit -m "feat(onboarding): add onboardingStep field to workspaces schema"
```

---

### Task 2: Onboarding Server Actions

**Files:**
- Create: `src/actions/onboarding.ts`

- [ ] **Step 1: Create onboarding actions file**

Create `src/actions/onboarding.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workspaces, icps, criteria, personas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { processSampleData } from "@/actions/scoring";
import type { ActionResult } from "@/lib/types";

export async function advanceOnboarding(
  step: number,
): Promise<ActionResult & { step?: number }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Only advance forward, never backward
  await db
    .update(workspaces)
    .set({ onboardingStep: step })
    .where(
      and(
        eq(workspaces.id, ctx.workspaceId),
        sql`${workspaces.onboardingStep} < ${step}`,
      ),
    );

  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true, step };
}

async function createDemoIcp(workspaceId: string): Promise<string> {
  const [icp] = await db
    .insert(icps)
    .values({
      workspaceId,
      name: "Sample ICP — FinTech",
      description:
        "Demo ICP for FinTech companies in EU/US. Edit or delete this anytime.",
      status: "active",
      version: 1,
    })
    .returning();

  await db.insert(criteria).values([
    {
      icpId: icp.id,
      group: "firmographic",
      category: "industry",
      value: "FinTech",
      operator: "equals",
      intent: "qualify",
      weight: 9,
      note: "Core industry",
    },
    {
      icpId: icp.id,
      group: "firmographic",
      category: "region",
      value: "EU, US",
      operator: "equals",
      intent: "qualify",
      weight: 6,
      note: "Target regions",
    },
    {
      icpId: icp.id,
      group: "firmographic",
      category: "company_size",
      value: "50-500",
      operator: "equals",
      intent: "qualify",
      weight: 4,
      note: "Mid-market focus",
    },
  ]);

  await db.insert(personas).values([
    {
      icpId: icp.id,
      name: "Head of Payments",
      description: "Decision maker for payment infrastructure",
    },
    {
      icpId: icp.id,
      name: "CFO",
      description: "Budget holder for financial operations",
    },
  ]);

  return icp.id;
}

export type ScoringSummary = {
  highFit: number;
  borderline: number;
  blocked: number;
  unmatched: number;
  topLeads: Array<{
    companyName: string;
    industry: string;
    fitLevel: string;
    fitScore: number;
  }>;
  uploadId: string;
};

export async function runOnboardingScoring(): Promise<
  ActionResult & { summary?: ScoringSummary }
> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Check if user has any ICPs
  const existingIcps = await db
    .select({ id: icps.id })
    .from(icps)
    .where(
      and(
        eq(icps.workspaceId, ctx.workspaceId),
        sql`${icps.status} IN ('active', 'draft')`,
      ),
    )
    .limit(1);

  // Create demo ICP if none exist
  if (existingIcps.length === 0) {
    await createDemoIcp(ctx.workspaceId);
  }

  // Run sample scoring
  const result = await processSampleData();
  if (result.error || !result.uploadId) {
    return { error: result.error ?? "Scoring failed" };
  }

  // Load scored leads for summary
  const { scoredLeads } = await import("@/db/schema");
  const leads = await db
    .select({
      companyName: sql<string>`${scoredLeads.rawData}->>'company_name'`,
      industry: scoredLeads.industry,
      fitLevel: scoredLeads.fitLevel,
      fitScore: scoredLeads.fitScore,
    })
    .from(scoredLeads)
    .where(eq(scoredLeads.uploadId, result.uploadId))
    .orderBy(sql`${scoredLeads.fitScore} DESC`)
    .limit(20);

  // Group by dashboard convention: High / Borderline / Blocked / Unmatched
  let highFit = 0;
  let borderline = 0;
  let blocked = 0;
  let unmatched = 0;

  for (const lead of leads) {
    switch (lead.fitLevel) {
      case "high":
        highFit++;
        break;
      case "medium":
      case "low":
      case "risk":
        borderline++;
        break;
      case "blocked":
        blocked++;
        break;
      default:
        unmatched++;
    }
  }

  const topLeads = leads.slice(0, 5).map((l) => ({
    companyName: l.companyName ?? "Unknown",
    industry: l.industry ?? "Unknown",
    fitLevel: l.fitLevel ?? "none",
    fitScore: l.fitScore ?? 0,
  }));

  return {
    success: true,
    summary: {
      highFit,
      borderline,
      blocked,
      unmatched,
      topLeads,
      uploadId: result.uploadId,
    },
  };
}
```

**Important references:**
- `getAuthContext` is in `src/lib/auth.ts` — returns `{ userId, workspaceId }` or null
- `processSampleData` is in `src/actions/scoring.ts:166-176` — runs 20 sample leads, returns `{ success, uploadId }`
- `scoredLeads` table has `rawData` (JSONB with company_name), `industry`, `fitLevel`, `fitScore`, `uploadId`
- `icps`, `criteria`, `personas` tables are in `src/db/schema.ts`

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/actions/onboarding.ts
git commit -m "feat(onboarding): add advanceOnboarding and runOnboardingScoring server actions"
```

---

### Task 3: Sidebar + Layout — Onboarding Step Prop Chain

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Update layout to fetch onboardingStep**

Rewrite `src/app/(app)/layout.tsx` to be async and fetch the onboarding step:

```typescript
import { AppShell } from "@/components/layout/app-shell";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let onboardingStep = 4; // default: completed (show full sidebar)

  const ctx = await getAuthContext();
  if (ctx) {
    const [workspace] = await db
      .select({ onboardingStep: workspaces.onboardingStep })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);
    if (workspace) {
      onboardingStep = workspace.onboardingStep;
    }
  }

  return <AppShell onboardingStep={onboardingStep}>{children}</AppShell>;
}
```

- [ ] **Step 2: Update AppShell to accept and forward prop**

Modify `src/components/layout/app-shell.tsx`:

```typescript
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  onboardingStep = 4,
}: {
  children: React.ReactNode;
  onboardingStep?: number;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onboardingStep={onboardingStep} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update Sidebar to filter items during onboarding**

In `src/components/layout/sidebar.tsx`, update the component to accept the prop and filter:

Add the prop to the function signature:

```typescript
export function Sidebar({ onboardingStep = 4 }: { onboardingStep?: number }) {
```

Replace the `navItems.map(...)` call with filtered items:

```typescript
  const ONBOARDING_HREFS = new Set(["/dashboard", "/settings/product", "/icps", "/scoring"]);
  const visibleItems = onboardingStep < 4
    ? navItems.filter((item) => ONBOARDING_HREFS.has(item.href))
    : navItems;
```

Then use `visibleItems.map(...)` instead of `navItems.map(...)`.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/layout.tsx src/components/layout/app-shell.tsx src/components/layout/sidebar.tsx
git commit -m "feat(onboarding): pass onboardingStep through layout → AppShell → Sidebar for item filtering"
```

---

### Task 4: Onboarding Stepper Component

**Files:**
- Create: `src/components/onboarding/onboarding-stepper.tsx`

- [ ] **Step 1: Create the stepper component**

Create `src/components/onboarding/onboarding-stepper.tsx`:

```tsx
import { Check } from "lucide-react";

const STEPS = [
  { label: "Product", step: 1 },
  { label: "ICP", step: 2 },
  { label: "Scoring", step: 3 },
  { label: "Done", step: 4 },
];

export function OnboardingStepper({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="flex items-center justify-center gap-0 py-4">
      {STEPS.map((s, i) => {
        const isCompleted = currentStep > s.step;
        const isCurrent = currentStep === s.step;
        const isFuture = currentStep < s.step;

        return (
          <div key={s.label} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  s.step
                )}
              </div>
              <span
                className={`text-xs ${
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isFuture
                      ? "text-muted-foreground"
                      : "font-medium text-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-10 transition-colors ${
                  currentStep > s.step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/onboarding-stepper.tsx
git commit -m "feat(onboarding): add stepper progress indicator component"
```

---

### Task 5: Step Product Component

**Files:**
- Create: `src/components/onboarding/step-product.tsx`

- [ ] **Step 1: Create the product context step**

Create `src/components/onboarding/step-product.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { IndustryPicker } from "@/components/shared/industry-picker";
import { saveProductContext } from "@/actions/product-context";
import { advanceOnboarding } from "@/actions/onboarding";

export function StepProduct({
  defaultValues,
}: {
  defaultValues?: {
    companyName?: string;
    productDescription?: string;
    industriesFocus?: string;
    geoFocus?: string;
  };
}) {
  const [industries, setIndustries] = useState(
    defaultValues?.industriesFocus ?? "",
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleNext(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const productDescription = (
        formData.get("productDescription") as string
      )?.trim();

      // Only save product context if description is filled
      // (saveProductContext requires productDescription NOT NULL)
      if (productDescription) {
        formData.set("industriesFocus", industries);
        const result = await saveProductContext(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
      }

      await advanceOnboarding(1);
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Tell iseep about your product
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This helps iseep evaluate market opportunities and suggest better ICPs.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={handleNext} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            name="companyName"
            placeholder="e.g. Acme Corp"
            defaultValue={defaultValues?.companyName ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productDescription">
            What does your company do?
          </Label>
          <Textarea
            id="productDescription"
            name="productDescription"
            placeholder="e.g. We provide crypto payment infrastructure for online businesses"
            rows={3}
            defaultValue={defaultValues?.productDescription ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Helps iseep understand your product for better suggestions.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Industries you focus on</Label>
          <input type="hidden" name="industriesFocus" value={industries} />
          <IndustryPicker
            value={industries}
            onChange={setIndustries}
            multiple
            placeholder="Select industries..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="geoFocus">Regions you focus on</Label>
          <Input
            id="geoFocus"
            name="geoFocus"
            placeholder="e.g. EU, US, LATAM"
            defaultValue={defaultValues?.geoFocus ?? ""}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Next →"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Reference:** `saveProductContext` expects FormData with fields: `productDescription`, `companyName`, `website`, `targetCustomers`, `coreUseCases`, `keyValueProps`, `industriesFocus`, `geoFocus`, `pricingModel`, `avgTicket`. Missing fields are treated as empty strings by the action.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/step-product.tsx
git commit -m "feat(onboarding): add step 1 - product context form"
```

---

### Task 6: Step ICP Component

**Files:**
- Create: `src/components/onboarding/step-icp.tsx`

- [ ] **Step 1: Create the ICP step**

Create `src/components/onboarding/step-icp.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Sparkles, PenLine, SkipForward } from "lucide-react";
import { parseIcpAction, confirmImportIcps } from "@/actions/import-icp";
import { advanceOnboarding } from "@/actions/onboarding";

type ParsedIcp = {
  name: string;
  description: string;
  criteria: Array<{
    group: string;
    category: string;
    value: string;
    intent: string;
    importance: number;
  }>;
  personas: Array<{ name: string; description: string }>;
};

export function StepIcp() {
  const [text, setText] = useState("");
  const [parsedIcps, setParsedIcps] = useState<ParsedIcp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParse] = useTransition();
  const [isCreating, startCreate] = useTransition();
  const [isSkipping, startSkip] = useTransition();

  function handleParse() {
    if (!text.trim()) return;
    setError(null);
    startParse(async () => {
      const result = await parseIcpAction(text);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.icps && result.icps.length > 0) {
        setParsedIcps(result.icps);
      } else {
        setError("Could not extract any ICPs from the text. Try adding more detail.");
      }
    });
  }

  function handleCreate() {
    if (!parsedIcps) return;
    startCreate(async () => {
      const result = await confirmImportIcps(parsedIcps);
      if (result.error) {
        setError(result.error);
        return;
      }
      await advanceOnboarding(2);
    });
  }

  function handleManual() {
    startSkip(async () => {
      await advanceOnboarding(2);
    });
  }

  function handleSkip() {
    startSkip(async () => {
      await advanceOnboarding(2);
    });
  }

  const anyPending = isParsing || isCreating || isSkipping;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Define who you&apos;re selling to
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          iseep scores leads against your ICP to find the best-fit companies.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Option A: Describe */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Describe your ideal customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {parsedIcps ? (
            // Show parsed preview
            <div className="space-y-3">
              {parsedIcps.map((icp, i) => (
                <div
                  key={i}
                  className="rounded-md border p-3 space-y-1"
                >
                  <p className="font-medium text-sm">{icp.name}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {icp.criteria.length} criteria
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {icp.personas.length} personas
                    </Badge>
                  </div>
                </div>
              ))}
              <Button
                onClick={handleCreate}
                disabled={anyPending}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${parsedIcps.length} ICP${parsedIcps.length > 1 ? "s" : ""}`
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsedIcps(null);
                  setError(null);
                }}
                className="w-full"
              >
                Start over
              </Button>
            </div>
          ) : (
            // Show textarea + parse
            <div className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. We target mid-market FinTech companies in EU that need payment infrastructure. Key decision makers are Heads of Payments and CFOs..."
                rows={4}
              />
              <Button
                onClick={handleParse}
                disabled={anyPending || !text.trim()}
                className="w-full"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  "Parse with AI"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Option B + C */}
      <div className="flex items-center gap-3">
        <Link href="/icps/new" onClick={handleManual} className="flex-1">
          <Button
            variant="outline"
            className="w-full"
            disabled={anyPending}
          >
            <PenLine className="mr-1.5 h-4 w-4" />
            Create manually
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={anyPending}
          className="flex-1"
        >
          {isSkipping ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <SkipForward className="mr-1.5 h-4 w-4" />
          )}
          Skip for now
        </Button>
      </div>
    </div>
  );
}
```

**Reference:** `parseIcpAction` is in `src/actions/import-icp.ts` — takes text string, returns `{ icps?: ParsedIcp[], error?: string }`. `confirmImportIcps` takes `ParsedIcp[]` and creates them in DB.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/step-icp.tsx
git commit -m "feat(onboarding): add step 2 - ICP import/create/skip"
```

---

### Task 7: Step Scoring Component

**Files:**
- Create: `src/components/onboarding/step-scoring.tsx`

- [ ] **Step 1: Create the scoring step**

Create `src/components/onboarding/step-scoring.tsx`:

```tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import {
  runOnboardingScoring,
  advanceOnboarding,
  type ScoringSummary,
} from "@/actions/onboarding";

const FIT_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-700 border-green-200",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  low: "bg-orange-500/10 text-orange-700 border-orange-200",
  risk: "bg-orange-500/10 text-orange-700 border-orange-200",
  blocked: "bg-red-500/10 text-red-700 border-red-200",
  none: "bg-muted text-muted-foreground border-border",
};

export function StepScoring() {
  const [summary, setSummary] = useState<ScoringSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScoring, startScoring] = useTransition();
  const [isFinishing, startFinish] = useTransition();
  const [started, setStarted] = useState(false);

  // Auto-start scoring on mount
  useEffect(() => {
    if (started) return;
    setStarted(true);
    startScoring(async () => {
      const result = await runOnboardingScoring();
      if (result.error) {
        setError(result.error);
      } else if (result.summary) {
        setSummary(result.summary);
      }
    });
  }, [started]);

  function handleRetry() {
    setError(null);
    startScoring(async () => {
      const result = await runOnboardingScoring();
      if (result.error) {
        setError(result.error);
      } else if (result.summary) {
        setSummary(result.summary);
      }
    });
  }

  function handleFinish() {
    startFinish(async () => {
      await advanceOnboarding(3);
    });
  }

  // Loading state
  if (isScoring || (!summary && !error)) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              Scoring sample leads...
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Running 20 companies against your ICP
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={handleRetry}>Try again</Button>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Here&apos;s how it works
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          iseep scored 20 sample companies against your ICP
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-md border bg-green-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">
            {summary!.highFit}
          </p>
          <p className="text-xs text-green-700/80">High fit</p>
        </div>
        <div className="rounded-md border bg-yellow-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">
            {summary!.borderline}
          </p>
          <p className="text-xs text-yellow-700/80">Borderline</p>
        </div>
        <div className="rounded-md border bg-red-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-red-700">
            {summary!.blocked}
          </p>
          <p className="text-xs text-red-700/80">Blocked</p>
        </div>
        <div className="rounded-md border bg-muted p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">
            {summary!.unmatched}
          </p>
          <p className="text-xs text-muted-foreground">Unmatched</p>
        </div>
      </div>

      {/* Top leads */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Top matches</p>
        <div className="space-y-1.5">
          {summary!.topLeads.map((lead, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {lead.companyName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lead.industry}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {lead.fitScore}%
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${FIT_COLORS[lead.fitLevel] ?? ""}`}
                >
                  {lead.fitLevel}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Upload your real leads to see results that matter.
      </p>

      <div className="flex justify-end">
        <Button onClick={handleFinish} disabled={isFinishing}>
          {isFinishing ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Finishing...
            </>
          ) : (
            "Finish →"
          )}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/step-scoring.tsx
git commit -m "feat(onboarding): add step 3 - auto sample scoring with inline results"
```

---

### Task 8: Step Done + Wizard Container

**Files:**
- Create: `src/components/onboarding/step-done.tsx`
- Create: `src/components/onboarding/onboarding-wizard.tsx`

- [ ] **Step 1: Create the done step**

Create `src/components/onboarding/step-done.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, LayoutDashboard, Loader2 } from "lucide-react";
import { advanceOnboarding } from "@/actions/onboarding";

export function StepDone() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction(redirect?: string) {
    startTransition(async () => {
      await advanceOnboarding(4);
      if (redirect) {
        router.push(redirect);
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold tracking-tight">
          You&apos;re ready!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your workspace is set up. Here&apos;s what to do next.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => !isPending && handleAction("/scoring/upload")}
        >
          <CardContent className="flex flex-col items-center gap-3 py-6">
            {isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
            <div className="text-center">
              <p className="text-sm font-semibold">Upload your leads</p>
              <p className="text-xs text-muted-foreground">
                Score real companies
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => !isPending && handleAction()}
        >
          <CardContent className="flex flex-col items-center gap-3 py-6">
            {isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-semibold">Explore dashboard</p>
              <p className="text-xs text-muted-foreground">
                See your workspace
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the wizard container**

Create `src/components/onboarding/onboarding-wizard.tsx`:

```tsx
"use client";

import { OnboardingStepper } from "./onboarding-stepper";
import { StepProduct } from "./step-product";
import { StepIcp } from "./step-icp";
import { StepScoring } from "./step-scoring";
import { StepDone } from "./step-done";

export function OnboardingWizard({
  step,
  productDefaults,
}: {
  step: number;
  productDefaults?: {
    companyName?: string;
    productDescription?: string;
    industriesFocus?: string;
    geoFocus?: string;
  };
}) {
  // step is the last completed step (0-4)
  // Wizard renders step + 1
  const currentVisualStep = step + 1;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <OnboardingStepper currentStep={currentVisualStep} />

      <div className="mt-8">
        {step === 0 && (
          <StepProduct defaultValues={productDefaults} />
        )}
        {step === 1 && <StepIcp />}
        {step === 2 && <StepScoring />}
        {step === 3 && <StepDone />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/step-done.tsx src/components/onboarding/onboarding-wizard.tsx
git commit -m "feat(onboarding): add step done component and wizard container"
```

---

### Task 9: Dashboard Integration

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard page to conditionally render wizard**

Modify `src/app/(app)/dashboard/page.tsx` to check `onboardingStep` and render wizard when `< 4`:

```typescript
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getDashboardState,
  getDashboardStats,
  getIcpHealth,
  getRecentActivity,
  getLatestScoringRun,
} from "@/lib/queries/dashboard";
import { getProductContext } from "@/lib/queries/product-context";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  // Check onboarding status
  const [workspace] = await db
    .select({ onboardingStep: workspaces.onboardingStep })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1);

  if (workspace && workspace.onboardingStep < 4) {
    // Load product context for pre-filling step 1
    const productCtx = await getProductContext(ctx.workspaceId);
    const productDefaults = productCtx
      ? {
          companyName: productCtx.companyName ?? undefined,
          productDescription: productCtx.productDescription ?? undefined,
          industriesFocus: Array.isArray(productCtx.industriesFocus)
            ? (productCtx.industriesFocus as string[]).join(", ")
            : undefined,
          geoFocus: Array.isArray(productCtx.geoFocus)
            ? (productCtx.geoFocus as string[]).join(", ")
            : undefined,
        }
      : undefined;

    return (
      <OnboardingWizard
        step={workspace.onboardingStep}
        productDefaults={productDefaults}
      />
    );
  }

  // Normal dashboard
  const [state, stats, icpHealth, latestRun, recentActivity, productCtx] =
    await Promise.all([
      getDashboardState(ctx.workspaceId),
      getDashboardStats(ctx.workspaceId),
      getIcpHealth(ctx.workspaceId),
      getLatestScoringRun(ctx.workspaceId),
      getRecentActivity(ctx.workspaceId),
      getProductContext(ctx.workspaceId),
    ]);

  return (
    <DashboardView
      state={state}
      stats={stats}
      icpHealth={icpHealth}
      latestRun={latestRun}
      recentActivity={recentActivity}
      hasProductContext={productCtx !== null}
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Manual test**

Run: `pnpm dev`

**Test new workspace flow:** Create a new account (or manually set `onboarding_step = 0` on an existing workspace). Navigate to `/dashboard`:
1. Should see wizard at Step 1 (Product Context) with stepper showing "Product" as active
2. Sidebar should show only 4 items: Dashboard, Product, ICPs, Score Leads
3. Fill in product description → click "Next" → should advance to Step 2
4. On Step 2, type a description → click "Parse with AI" → should show ICP preview → "Create ICP"
5. Step 3 should auto-run sample scoring and show results inline
6. Click "Finish" → Step Done with 2 CTA cards
7. Click "Explore dashboard" → normal dashboard appears, sidebar shows all 12 items

**Test existing workspace:** Verify that existing workspaces (onboardingStep = 4 by default) see the normal dashboard unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat(onboarding): integrate wizard into dashboard page"
```

---

### Task 10: Final Verification + CLAUDE.md

**Files:**
- Verify all, update CLAUDE.md

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Fix any new lint errors from onboarding files.

- [ ] **Step 3: Update CLAUDE.md**

Add to CLAUDE.md:
- New section or update existing: Onboarding Wizard [IMPLEMENTED]
- Update file structure with `src/components/onboarding/` and `src/actions/onboarding.ts`
- Update current state table: `Onboarding flow` → `[IMPLEMENTED]`
- Remove from known gaps P1

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with onboarding wizard"
```
