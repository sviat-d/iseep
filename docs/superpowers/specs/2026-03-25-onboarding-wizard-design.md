# Onboarding Wizard — Design Spec

> **Goal:** Guide new users through Product Context → First ICP → Sample Scoring so they see iseep's value in under 5 minutes, with a simplified sidebar during onboarding.

## 1. Problem

After sign-up, users land on an empty dashboard with three competing CTAs (Create ICP, Import, Sample Data) and no guidance on what to do first. The full 12-item sidebar is overwhelming. Product context — which powers cluster evaluation — is buried as an optional nudge. There is no "aha moment" for new users.

## 2. Solution

A 3-step wizard that replaces the dashboard empty state:
1. **Product Context** — minimal form (4 fields) to establish company context
2. **First ICP** — import from text or skip
3. **Sample Scoring** — auto-run 20 demo leads, show results inline

After completion, the wizard never shows again. During onboarding, the sidebar shows only 4 items. After completion, all 12 items appear.

Every step is optional — user can press "Next" without filling anything.

## 3. Data Model

### New field on `workspaces`

```sql
ALTER TABLE workspaces ADD COLUMN onboarding_step integer NOT NULL DEFAULT 0;
```

Values:
- `0` — not started (just signed up)
- `1` — product context done (or skipped)
- `2` — ICP step done (or skipped)
- `3` — sample scoring done
- `4` — onboarding completed (wizard never shows again)

**Why integer not boolean:** Tracks where user left off if they close the browser. Returning to dashboard resumes at the correct step.

### Server action

`advanceOnboarding(step: number)` — updates `workspaces.onboardingStep` to `step` only if `step > current`. Returns the new step value.

## 4. Wizard Flow

### Trigger

Dashboard page checks `workspace.onboardingStep`:
- `< 4` → render `<OnboardingWizard step={onboardingStep} />`
- `>= 4` → render existing dashboard (no changes to current dashboard code)

### Step 1: Product Context

Simplified form with 4 fields (not the full 10-field product context form):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Company name | text input | No | Maps to `productContext.companyName` |
| What does your company do? | textarea | Encouraged but not blocking | Maps to `productContext.productDescription` |
| Industries you focus on | IndustryPicker (multi) | No | Maps to `productContext.industriesFocus` |
| Regions you focus on | text input | No | Maps to `productContext.geoFocus` |

**"Next" button:** Saves whatever is filled via existing `saveProductContext` action (with empty strings for omitted fields), then calls `advanceOnboarding(1)`. If all fields are empty, still advances (skip behavior).

**Copy:** "Tell iseep about your product" heading, "This helps iseep evaluate market opportunities and suggest better ICPs" subtitle.

### Step 2: First ICP

Three options on one screen:

**Option A: "Describe your ideal customer"**
- Textarea for free-text description
- "Parse" button → calls existing `parseIcpAction`
- Shows preview of extracted ICP (name, criteria count, personas count)
- "Create ICP" button → calls existing `confirmImportIcps` → `advanceOnboarding(2)`

**Option B: "Create manually"**
- Link to `/icps/new`
- Before navigating, calls `advanceOnboarding(2)` so wizard knows this step is done
- When user returns to dashboard, wizard shows step 3

**Option C: "Skip for now"**
- Calls `advanceOnboarding(2)` directly
- Step 3 will use a temporary demo ICP for sample scoring

**Copy:** "Define who you're selling to" heading, "iseep scores leads against your ICP to find the best-fit companies" subtitle.

### Step 3: Sample Scoring

Automatic — no user input needed:

1. Check if user created an ICP in step 2
   - If yes: use that ICP for scoring
   - If no: create a temporary demo ICP using existing sample data infrastructure (`src/lib/sample-data.ts`)
2. Run 20 sample leads through scoring (reuse `processSampleData` pattern)
3. Display results inline:
   - Stats bar: 4 colored badges showing count per fit level (high/medium/low/blocked)
   - Top 5 leads mini-table: company name, industry, fit level badge, fit score
   - Brief explanation: "iseep scored 20 sample companies against your ICP. Upload your real leads to see results that matter."

**"Finish" button:** Calls `advanceOnboarding(3)`, then shows step Done.

**No user action required** beyond viewing results and clicking Finish.

### Step Done

- Heading: "You're ready!"
- Subtitle: "Your workspace is set up. Here's what to do next."
- Two CTA cards:
  - **"Upload your leads"** → navigates to `/scoring/upload`, sets `onboardingStep = 4`
  - **"Explore dashboard"** → stays on `/dashboard`, sets `onboardingStep = 4`
- Both CTAs complete onboarding permanently

## 5. Sidebar During Onboarding

### Current sidebar (12 items)

Dashboard, Product, ICPs, Segments, Deals, Companies, Requests, Insights, Score Leads, Export, Suggestions, AI Settings

### Onboarding sidebar (4 items)

Dashboard, Product, ICPs, Score Leads

**Logic:** In `sidebar.tsx`, check `workspace.onboardingStep`. If `< 4`, filter `navItems` to only show the 4 onboarding-relevant items. If `>= 4`, show all.

The workspace `onboardingStep` value is loaded in the app layout (`src/app/(app)/layout.tsx`) and passed to the sidebar component.

### Transition

When `advanceOnboarding(4)` is called (from step Done), the page reloads/revalidates → sidebar expands to full 12 items, dashboard shows normal content.

## 6. Stepper UI

A horizontal progress bar at the top of the wizard:

```
  ● Product ─── ● ICP ─── ● Scoring ─── ○ Done
  (active)      (next)     (next)        (next)
```

- Completed steps: filled circle, bold label
- Current step: filled circle with ring, active label
- Future steps: empty circle, muted label
- Progress line between steps fills as user advances

Built as a simple `<OnboardingStepper currentStep={step} />` component. No click-to-navigate (steps are sequential).

## 7. Integration Points

### Reused actions (no changes needed)
- `saveProductContext(formData)` — step 1 saves product context
- `parseIcpAction(text)` — step 2 parses text into ICP
- `confirmImportIcps(icps)` — step 2 creates parsed ICP
- `processSampleData()` — step 3 runs sample scoring

### New action
- `advanceOnboarding(step)` in `src/actions/onboarding.ts` — updates workspace onboarding step

### Modified files
- `src/db/schema.ts` — add `onboardingStep` field to `workspaces`
- `src/app/(app)/dashboard/page.tsx` — check `onboardingStep`, render wizard or dashboard
- `src/app/(app)/layout.tsx` — load `onboardingStep`, pass to sidebar
- `src/components/layout/sidebar.tsx` — filter items based on `onboardingStep`

## 8. File Structure

### New files

```
src/actions/onboarding.ts              — advanceOnboarding server action

src/components/onboarding/
  onboarding-wizard.tsx               — container: stepper + step switching
  onboarding-stepper.tsx              — horizontal progress indicator
  step-product.tsx                    — simplified product context form
  step-icp.tsx                        — ICP import/skip options
  step-scoring.tsx                    — auto sample scoring + results display
  step-done.tsx                       — completion screen with CTAs
```

### Modified files

```
src/db/schema.ts                       — add onboardingStep to workspaces
src/app/(app)/dashboard/page.tsx       — conditional render wizard vs dashboard
src/app/(app)/layout.tsx               — load onboardingStep for sidebar
src/components/layout/sidebar.tsx      — filter nav items during onboarding
```

## 9. Migration

```sql
ALTER TABLE workspaces ADD COLUMN onboarding_step integer NOT NULL DEFAULT 4;
```

**Default is 4 (completed)**, not 0. Existing workspaces have already passed the "onboarding" phase — they should see the full dashboard and full sidebar. Only new workspaces created after this migration start at 0.

The sign-up flow (`src/actions/auth.ts`) must be updated to explicitly set `onboardingStep: 0` when creating a new workspace. Since the DB default is 4, the insert must include this field.

## 10. Edge Cases

- **User closes browser mid-wizard:** Returns to dashboard → wizard resumes at saved step. State is in DB, not client.
- **User navigates to `/icps` during wizard:** Sidebar shows ICPs link, they can navigate freely. Returning to dashboard shows wizard at current step.
- **User creates ICP via sidebar during step 1:** No conflict. Step 2 will detect existing ICP and still offer import/skip.
- **User has product context from before (API/draft):** Step 1 pre-fills with existing data.
- **Sample scoring with no ICP:** Step 3 creates a temporary demo ICP, runs scoring, shows results. Demo upload is cleaned up or kept as reference.

## 11. Backward Compatibility

- **Existing workspaces:** Migration defaults `onboardingStep = 4` → no wizard shown, full sidebar visible. Zero impact.
- **Dashboard code:** Existing dashboard components (`HasIcpsState`, `HasScoringState`, `MainDashboard`) remain unchanged. Wizard is an alternative render path, not a modification.
- **Nudges:** `ProductContextNudge` and `AiNudge` continue to work as before for users who skipped onboarding steps.
