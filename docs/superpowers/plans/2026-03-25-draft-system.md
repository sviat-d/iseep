# Draft System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a draft/suggestion system so Claude (or any AI agent) can propose changes to iseep data through reviewable drafts with approve/reject flow.

**Architecture:** One generic `drafts` DB table with typed JSONB payloads. Zod validators per target_type. Two input paths (paste UI + API endpoint). Inbox page + review page with diff preview. Apply logic creates/updates real entities from approved drafts.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Drizzle ORM, Zod v4 (`zod/v4`), shadcn/ui, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-25-draft-system-design.md`

---

### Task 1: Schema — drafts table + api_token

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add drafts table and api_token to schema**

Add to `src/db/schema.ts` after the `rejectedIcps` table definition:

```typescript
// ─── V. Drafts (AI suggestions) ───────────────────────────────────────────

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  source: text("source").notNull(), // "claude" | "manual" | "system"
  targetType: text("target_type").notNull(), // "create_icp" | "update_product" | "update_icp" | "create_segment"
  targetId: uuid("target_id"), // null for create, entity id for update
  payload: jsonb("payload").notNull(),
  summary: text("summary").notNull(),
  reasoning: text("reasoning"),
  status: text("status", { enum: ["pending", "rejected", "applied"] })
    .default("pending")
    .notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
});
```

Also add `apiToken` field to the existing `workspaces` table definition (after `profileSharedIcpIds`):

```typescript
  apiToken: text("api_token").unique(),
```

- [ ] **Step 2: Generate migration**

Run: `npx drizzle-kit generate`

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add drafts table and api_token to schema"
```

---

### Task 2: Draft types and Zod validators

**Files:**
- Create: `src/lib/drafts/types.ts`

- [ ] **Step 1: Create types and validators**

```typescript
// src/lib/drafts/types.ts

import { z } from "zod/v4";

// ── Target types ────────────────────────────────────────────────────────────

export const DRAFT_TARGET_TYPES = [
  "create_icp",
  "update_product",
  "update_icp",
  "create_segment",
] as const;

export type DraftTargetType = (typeof DRAFT_TARGET_TYPES)[number];

// ── Payload schemas per target_type ─────────────────────────────────────────

const criterionSchema = z.object({
  group: z.enum(["firmographic", "technographic", "behavioral", "compliance", "keyword"]),
  category: z.string().min(1),
  value: z.string().min(1),
  intent: z.enum(["qualify", "risk", "exclude"]),
  importance: z.number().min(1).max(10).optional(),
  note: z.string().optional(),
});

const personaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const createIcpPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criteria: z.array(criterionSchema).default([]),
  personas: z.array(personaSchema).default([]),
});

export const updateProductPayloadSchema = z.object({
  companyName: z.string().optional(),
  website: z.string().optional(),
  productDescription: z.string().optional(),
  targetCustomers: z.string().optional(),
  coreUseCases: z.array(z.string()).optional(),
  keyValueProps: z.array(z.string()).optional(),
  industriesFocus: z.array(z.string()).optional(),
  geoFocus: z.array(z.string()).optional(),
  pricingModel: z.string().optional(),
  avgTicket: z.string().optional(),
});

export const updateIcpPayloadSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  addCriteria: z.array(criterionSchema).optional(),
  removeCriteria: z.array(z.object({
    category: z.string().min(1),
    value: z.string().min(1),
  })).optional(),
  addPersonas: z.array(personaSchema).optional(),
  removePersonas: z.array(z.object({
    name: z.string().min(1),
  })).optional(),
});

export const createSegmentPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icpId: z.string().uuid(),
  logicJson: z.record(z.string(), z.unknown()).optional(),
  priorityScore: z.number().min(1).max(10).optional(),
});

// ── Map target_type → schema ────────────────────────────────────────────────

export const PAYLOAD_SCHEMAS: Record<DraftTargetType, z.ZodType> = {
  create_icp: createIcpPayloadSchema,
  update_product: updateProductPayloadSchema,
  update_icp: updateIcpPayloadSchema,
  create_segment: createSegmentPayloadSchema,
};

// ── Input schema (what Claude/agents send) ──────────────────────────────────

export const draftInputItemSchema = z.object({
  target_type: z.enum(DRAFT_TARGET_TYPES),
  target_id: z.string().uuid().optional(),
  summary: z.string().min(1),
  reasoning: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const draftsInputSchema = z.object({
  drafts: z.array(draftInputItemSchema).min(1),
});

export type DraftInputItem = z.infer<typeof draftInputItemSchema>;
export type DraftsInput = z.infer<typeof draftsInputSchema>;
export type CreateIcpPayload = z.infer<typeof createIcpPayloadSchema>;
export type UpdateProductPayload = z.infer<typeof updateProductPayloadSchema>;
export type UpdateIcpPayload = z.infer<typeof updateIcpPayloadSchema>;
export type CreateSegmentPayload = z.infer<typeof createSegmentPayloadSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/drafts/types.ts
git commit -m "feat: add draft Zod validators for all 4 target types"
```

---

### Task 3: Parser — validate and transform input

**Files:**
- Create: `src/lib/drafts/parse.ts`

- [ ] **Step 1: Create parser**

```typescript
// src/lib/drafts/parse.ts

import {
  draftsInputSchema,
  PAYLOAD_SCHEMAS,
  type DraftTargetType,
  type DraftInputItem,
} from "./types";

export type ParsedDraft = {
  targetType: DraftTargetType;
  targetId: string | null;
  summary: string;
  reasoning: string | null;
  payload: Record<string, unknown>;
};

export type ParseResult =
  | { success: true; drafts: ParsedDraft[] }
  | { success: false; error: string; details?: Array<{ index: number; issues: string[] }> };

export function parseDraftsInput(jsonString: string): ParseResult {
  // Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { success: false, error: "Invalid JSON. Please check the format." };
  }

  // Validate top-level structure
  const topResult = draftsInputSchema.safeParse(raw);
  if (!topResult.success) {
    return {
      success: false,
      error: "Invalid format. Expected { \"drafts\": [...] }",
      details: topResult.error.issues.map((iss) => ({
        index: 0,
        issues: [iss.message],
      })),
    };
  }

  // Validate each draft's payload against its target_type schema
  const errors: Array<{ index: number; issues: string[] }> = [];
  const parsed: ParsedDraft[] = [];

  for (let i = 0; i < topResult.data.drafts.length; i++) {
    const item: DraftInputItem = topResult.data.drafts[i];
    const payloadSchema = PAYLOAD_SCHEMAS[item.target_type];
    const payloadResult = payloadSchema.safeParse(item.payload);

    if (!payloadResult.success) {
      errors.push({
        index: i,
        issues: payloadResult.error.issues.map(
          (iss) => `${iss.path.join(".")}: ${iss.message}`,
        ),
      });
      continue;
    }

    // Validate target_id requirement for update types
    if (
      (item.target_type === "update_product" || item.target_type === "update_icp") &&
      !item.target_id
    ) {
      errors.push({
        index: i,
        issues: [`target_id is required for ${item.target_type}`],
      });
      continue;
    }

    parsed.push({
      targetType: item.target_type,
      targetId: item.target_id ?? null,
      summary: item.summary,
      reasoning: item.reasoning ?? null,
      payload: payloadResult.data as Record<string, unknown>,
    });
  }

  if (errors.length > 0) {
    return { success: false, error: "Validation failed", details: errors };
  }

  return { success: true, drafts: parsed };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/drafts/parse.ts
git commit -m "feat: add draft input parser with per-type payload validation"
```

---

### Task 4: Apply logic

**Files:**
- Create: `src/lib/drafts/apply.ts`

- [ ] **Step 1: Create apply logic**

This file contains the core logic for each target_type. It does NOT handle auth or draft status updates — that's the server action's job.

```typescript
// src/lib/drafts/apply.ts

import { db } from "@/db";
import {
  icps,
  criteria,
  personas,
  segments,
  productContext,
  icpSnapshots,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type {
  CreateIcpPayload,
  UpdateProductPayload,
  UpdateIcpPayload,
  CreateSegmentPayload,
} from "./types";

export async function applyCreateIcp(
  workspaceId: string,
  userId: string,
  payload: CreateIcpPayload,
): Promise<{ icpId: string }> {
  const [icp] = await db
    .insert(icps)
    .values({
      workspaceId,
      name: payload.name,
      description: payload.description || null,
      status: "draft",
      createdBy: userId,
    })
    .returning();

  for (const c of payload.criteria) {
    await db.insert(criteria).values({
      workspaceId,
      icpId: icp.id,
      group: c.group,
      category: c.category,
      operator: "equals",
      value: c.value,
      intent: c.intent,
      weight: c.intent === "qualify" ? (c.importance ?? 5) : null,
      note: c.note ?? null,
    });
  }

  for (const p of payload.personas) {
    await db.insert(personas).values({
      workspaceId,
      icpId: icp.id,
      name: p.name,
      description: p.description || null,
    });
  }

  return { icpId: icp.id };
}

export async function applyUpdateProduct(
  workspaceId: string,
  payload: UpdateProductPayload,
): Promise<void> {
  const [existing] = await db
    .select({ id: productContext.id })
    .from(productContext)
    .where(eq(productContext.workspaceId, workspaceId));

  if (!existing) {
    throw new Error("Product context does not exist. Create it first.");
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (payload.companyName !== undefined) updates.companyName = payload.companyName;
  if (payload.website !== undefined) updates.website = payload.website;
  if (payload.productDescription !== undefined) updates.productDescription = payload.productDescription;
  if (payload.targetCustomers !== undefined) updates.targetCustomers = payload.targetCustomers;
  if (payload.coreUseCases !== undefined) updates.coreUseCases = payload.coreUseCases;
  if (payload.keyValueProps !== undefined) updates.keyValueProps = payload.keyValueProps;
  if (payload.industriesFocus !== undefined) updates.industriesFocus = payload.industriesFocus;
  if (payload.geoFocus !== undefined) updates.geoFocus = payload.geoFocus;
  if (payload.pricingModel !== undefined) updates.pricingModel = payload.pricingModel;
  if (payload.avgTicket !== undefined) updates.avgTicket = payload.avgTicket;

  await db.update(productContext).set(updates).where(eq(productContext.id, existing.id));
}

export async function applyUpdateIcp(
  workspaceId: string,
  icpId: string,
  payload: UpdateIcpPayload,
): Promise<void> {
  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, workspaceId)));

  if (!icp) throw new Error("ICP not found");

  // Update name/description if provided
  if (payload.name !== undefined || payload.description !== undefined) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    await db.update(icps).set(updates).where(eq(icps.id, icpId));
  }

  // Remove criteria by value match
  if (payload.removeCriteria && payload.removeCriteria.length > 0) {
    const allCriteria = await db
      .select()
      .from(criteria)
      .where(and(eq(criteria.icpId, icpId), eq(criteria.workspaceId, workspaceId)));

    for (const toRemove of payload.removeCriteria) {
      const match = allCriteria.find(
        (c) =>
          c.category.toLowerCase() === toRemove.category.toLowerCase() &&
          c.value.toLowerCase() === toRemove.value.toLowerCase(),
      );
      if (match) {
        await db.delete(criteria).where(eq(criteria.id, match.id));
      }
    }
  }

  // Add new criteria
  if (payload.addCriteria && payload.addCriteria.length > 0) {
    for (const c of payload.addCriteria) {
      await db.insert(criteria).values({
        workspaceId,
        icpId,
        group: c.group as "firmographic" | "technographic" | "behavioral" | "compliance" | "keyword",
        category: c.category,
        operator: "equals",
        value: c.value,
        intent: c.intent,
        weight: c.intent === "qualify" ? (c.importance ?? 5) : null,
        note: c.note ?? null,
      });
    }
  }

  // Remove personas by name match
  if (payload.removePersonas && payload.removePersonas.length > 0) {
    const allPersonas = await db
      .select()
      .from(personas)
      .where(and(eq(personas.icpId, icpId), eq(personas.workspaceId, workspaceId)));

    for (const toRemove of payload.removePersonas) {
      const match = allPersonas.find(
        (p) => p.name.toLowerCase() === toRemove.name.toLowerCase(),
      );
      if (match) {
        await db.delete(personas).where(eq(personas.id, match.id));
      }
    }
  }

  // Add new personas
  if (payload.addPersonas && payload.addPersonas.length > 0) {
    for (const p of payload.addPersonas) {
      await db.insert(personas).values({
        workspaceId,
        icpId,
        name: p.name,
        description: p.description || null,
      });
    }
  }

  // Bump version + create snapshot
  const newVersion = icp.version + 1;
  await db.update(icps).set({ version: newVersion, updatedAt: new Date() }).where(eq(icps.id, icpId));

  // Load current state for snapshot
  const currentCriteria = await db.select().from(criteria).where(eq(criteria.icpId, icpId));
  const currentPersonas = await db.select().from(personas).where(eq(personas.icpId, icpId));

  await db.insert(icpSnapshots).values({
    workspaceId,
    icpId,
    version: newVersion,
    snapshotData: {
      schemaVersion: 1,
      icp: { name: payload.name ?? icp.name, description: payload.description ?? icp.description, status: icp.status },
      criteria: currentCriteria.map((c) => ({
        group: c.group, category: c.category, operator: c.operator,
        value: c.value, intent: c.intent, weight: c.weight, note: c.note,
      })),
      personas: currentPersonas.map((p) => ({ name: p.name, description: p.description })),
      signals: [],
      stats: {
        qualifyCount: currentCriteria.filter((c) => c.intent === "qualify").length,
        excludeCount: currentCriteria.filter((c) => c.intent === "exclude").length,
        personaCount: currentPersonas.length,
        signalCount: 0, dealCount: 0, wonCount: 0, lostCount: 0,
      },
    },
    changeSummary: "Updated via AI suggestion",
  });
}

export async function applyCreateSegment(
  workspaceId: string,
  payload: CreateSegmentPayload,
): Promise<{ segmentId: string }> {
  const [segment] = await db
    .insert(segments)
    .values({
      workspaceId,
      icpId: payload.icpId,
      name: payload.name,
      description: payload.description || null,
      logicJson: payload.logicJson ?? {},
      status: "draft",
      priorityScore: payload.priorityScore ?? 5,
    })
    .returning();

  return { segmentId: segment.id };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/drafts/apply.ts
git commit -m "feat: add draft apply logic for all 4 target types"
```

---

### Task 5: Server actions + API endpoint

**Files:**
- Create: `src/actions/drafts.ts`
- Create: `src/app/api/drafts/route.ts`

- [ ] **Step 1: Create server actions**

```typescript
// src/actions/drafts.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { drafts, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { parseDraftsInput, type ParsedDraft } from "@/lib/drafts/parse";
import {
  applyCreateIcp,
  applyUpdateProduct,
  applyUpdateIcp,
  applyCreateSegment,
} from "@/lib/drafts/apply";
import type {
  CreateIcpPayload,
  UpdateProductPayload,
  UpdateIcpPayload,
  CreateSegmentPayload,
} from "@/lib/drafts/types";
import { randomBytes } from "crypto";

export async function createDrafts(
  jsonString: string,
  source: string = "claude",
): Promise<ActionResult & { ids?: string[] }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const result = parseDraftsInput(jsonString);
  if (!result.success) {
    return { error: result.error };
  }

  const ids: string[] = [];
  for (const d of result.drafts) {
    const [row] = await db
      .insert(drafts)
      .values({
        workspaceId: ctx.workspaceId,
        source,
        targetType: d.targetType,
        targetId: d.targetId,
        payload: d.payload,
        summary: d.summary,
        reasoning: d.reasoning,
        createdBy: ctx.userId,
      })
      .returning({ id: drafts.id });
    ids.push(row.id);
  }

  revalidatePath("/drafts");
  return { success: true, ids };
}

export async function approveDraft(
  draftId: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [draft] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.workspaceId, ctx.workspaceId)));

  if (!draft) return { error: "Draft not found" };
  if (draft.status !== "pending") return { error: `Draft is already ${draft.status}` };

  try {
    switch (draft.targetType) {
      case "create_icp":
        await applyCreateIcp(ctx.workspaceId, ctx.userId, draft.payload as CreateIcpPayload);
        revalidatePath("/icps");
        break;
      case "update_product":
        await applyUpdateProduct(ctx.workspaceId, draft.payload as UpdateProductPayload);
        revalidatePath("/settings/product");
        revalidatePath("/dashboard");
        break;
      case "update_icp":
        if (!draft.targetId) return { error: "Missing target ICP ID" };
        await applyUpdateIcp(ctx.workspaceId, draft.targetId, draft.payload as UpdateIcpPayload);
        revalidatePath("/icps");
        revalidatePath(`/icps/${draft.targetId}`);
        break;
      case "create_segment":
        await applyCreateSegment(ctx.workspaceId, draft.payload as CreateSegmentPayload);
        revalidatePath("/segments");
        break;
      default:
        return { error: `Unknown target type: ${draft.targetType}` };
    }

    await db
      .update(drafts)
      .set({
        status: "applied",
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        appliedAt: new Date(),
      })
      .where(eq(drafts.id, draftId));

    revalidatePath("/drafts");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to apply: ${msg}` };
  }
}

export async function rejectDraft(
  draftId: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [draft] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.workspaceId, ctx.workspaceId)));

  if (!draft) return { error: "Draft not found" };
  if (draft.status !== "pending") return { error: `Draft is already ${draft.status}` };

  await db
    .update(drafts)
    .set({
      status: "rejected",
      reviewedBy: ctx.userId,
      reviewedAt: new Date(),
    })
    .where(eq(drafts.id, draftId));

  revalidatePath("/drafts");
  return { success: true };
}

export async function generateApiToken(): Promise<ActionResult & { token?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const token = randomBytes(32).toString("hex");

  await db
    .update(workspaces)
    .set({ apiToken: token, updatedAt: new Date() })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/settings/ai");
  return { success: true, token };
}
```

- [ ] **Step 2: Create API route**

```typescript
// src/app/api/drafts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, drafts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseDraftsInput } from "@/lib/drafts/parse";

export async function POST(request: NextRequest) {
  // Auth via bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.apiToken, token));

  if (!ws) {
    return NextResponse.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  // Parse body
  let body: string;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const result = parseDraftsInput(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: 400 },
    );
  }

  // Create drafts
  const ids: string[] = [];
  for (const d of result.drafts) {
    const [row] = await db
      .insert(drafts)
      .values({
        workspaceId: ws.id,
        source: "claude",
        targetType: d.targetType,
        targetId: d.targetId,
        payload: d.payload,
        summary: d.summary,
        reasoning: d.reasoning,
      })
      .returning({ id: drafts.id });
    ids.push(row.id);
  }

  return NextResponse.json(
    { created: ids.length, ids },
    { status: 201 },
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/actions/drafts.ts src/app/api/drafts/route.ts
git commit -m "feat: add draft server actions and API endpoint"
```

---

### Task 6: Draft import form (paste UI)

**Files:**
- Create: `src/components/drafts/draft-import-form.tsx`
- Create: `src/app/(app)/drafts/import/page.tsx`

- [ ] **Step 1: Create import form component**

```tsx
// src/components/drafts/draft-import-form.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createDrafts } from "@/actions/drafts";
import { parseDraftsInput, type ParsedDraft } from "@/lib/drafts/parse";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Target,
  Package,
  Layers,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  create_icp: { label: "New ICP", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Target },
  update_product: { label: "Update Product", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: Package },
  update_icp: { label: "Update ICP", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Target },
  create_segment: { label: "New Segment", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: Layers },
};

const PLACEHOLDER = `{
  "drafts": [
    {
      "target_type": "create_icp",
      "summary": "ICP for Creator Economy",
      "reasoning": "Based on your product context...",
      "payload": {
        "name": "Creator Economy",
        "description": "...",
        "criteria": [
          { "group": "firmographic", "category": "industry", "value": "Creator Economy", "intent": "qualify", "importance": 9 }
        ],
        "personas": [
          { "name": "Head of Finance" }
        ]
      }
    }
  ]
}`;

export function DraftImportForm() {
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedDraft[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleParse() {
    setParseError(null);
    const result = parseDraftsInput(text);
    if (!result.success) {
      setParseError(result.error);
      return;
    }
    setParsed(result.drafts);
    setStep("preview");
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createDrafts(text);
      if (result.error) {
        setParseError(result.error);
        setStep("paste");
        return;
      }
      setCreatedCount(result.ids?.length ?? 0);
      setStep("done");
    });
  }

  if (step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <div className="text-center">
            <p className="text-lg font-medium">
              {createdCount} suggestion{createdCount !== 1 ? "s" : ""} created
            </p>
            <p className="text-sm text-muted-foreground">
              Review and approve them in the suggestions inbox
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/drafts">
              <Button>
                Go to inbox
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button variant="outline" onClick={() => { setStep("paste"); setText(""); setParsed([]); }}>
              Import more
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {parsed.length} suggestion{parsed.length !== 1 ? "s" : ""} parsed
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("paste")}>
              Back
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${parsed.length} suggestion${parsed.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </div>
        {parsed.map((d, i) => {
          const config = TYPE_CONFIG[d.targetType] ?? { label: d.targetType, color: "bg-gray-100 text-gray-800", icon: Target };
          return (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 py-3">
                <config.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-sm font-medium">{d.summary}</span>
                  </div>
                  {d.reasoning && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {d.reasoning}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Step: paste
  return (
    <div className="space-y-4">
      {parseError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {parseError}
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={20}
        className="font-mono text-xs"
      />
      <Button onClick={handleParse} disabled={!text.trim()}>
        Parse suggestions
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create import page**

```tsx
// src/app/(app)/drafts/import/page.tsx
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { DraftImportForm } from "@/components/drafts/draft-import-form";

export default async function DraftImportPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Suggestions</h1>
        <p className="text-muted-foreground">
          Paste structured JSON from Claude or another AI to create reviewable suggestions
        </p>
      </div>
      <DraftImportForm />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/drafts/draft-import-form.tsx "src/app/(app)/drafts/import/page.tsx"
git commit -m "feat: add paste UI for importing Claude suggestions"
```

---

### Task 7: Drafts inbox page

**Files:**
- Create: `src/components/drafts/drafts-inbox.tsx`
- Create: `src/app/(app)/drafts/page.tsx`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Create inbox component**

```tsx
// src/components/drafts/drafts-inbox.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Package,
  Layers,
  ArrowRight,
  Plus,
  Inbox as InboxIcon,
} from "lucide-react";

type Draft = {
  id: string;
  source: string;
  targetType: string;
  summary: string;
  status: string;
  createdAt: Date;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  create_icp: { label: "New ICP", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Target },
  update_product: { label: "Update Product", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: Package },
  update_icp: { label: "Update ICP", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Target },
  create_segment: { label: "New Segment", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: Layers },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  pending: "default",
  applied: "secondary",
  rejected: "outline",
};

const TABS = ["pending", "applied", "rejected", "all"] as const;

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DraftsInbox({ drafts: allDrafts }: { drafts: Draft[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");

  const filtered = tab === "all" ? allDrafts : allDrafts.filter((d) => d.status === tab);
  const pendingCount = allDrafts.filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Tabs + Import button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {t === "pending" && pendingCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link href="/drafts/import">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Import suggestions
          </Button>
        </Link>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <InboxIcon className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium">No suggestions yet</p>
            <p className="text-xs text-muted-foreground">
              Copy your GTM context to Claude and ask for improvements, then paste the response here
            </p>
          </div>
          <Link href="/drafts/import">
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Import suggestions
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((draft) => {
            const config = TYPE_CONFIG[draft.targetType] ?? {
              label: draft.targetType,
              color: "bg-gray-100 text-gray-800",
              icon: Target,
            };
            return (
              <Link key={draft.id} href={`/drafts/${draft.id}`} className="block">
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center gap-3 py-3">
                    <config.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="truncate text-sm font-medium">{draft.summary}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {draft.source}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[draft.status] ?? "outline"} className="text-[10px] capitalize">
                        {draft.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(draft.createdAt)}
                      </span>
                      {draft.status === "pending" && (
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create inbox page**

```tsx
// src/app/(app)/drafts/page.tsx
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { drafts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { DraftsInbox } from "@/components/drafts/drafts-inbox";

export default async function DraftsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const allDrafts = await db
    .select({
      id: drafts.id,
      source: drafts.source,
      targetType: drafts.targetType,
      summary: drafts.summary,
      status: drafts.status,
      createdAt: drafts.createdAt,
    })
    .from(drafts)
    .where(eq(drafts.workspaceId, ctx.workspaceId))
    .orderBy(sql`${drafts.createdAt} desc`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suggestions</h1>
        <p className="text-muted-foreground">
          Review changes proposed by Claude or your team
        </p>
      </div>
      <DraftsInbox drafts={allDrafts} />
    </div>
  );
}
```

- [ ] **Step 3: Add Suggestions to sidebar**

In `src/components/layout/sidebar.tsx`, add `Inbox` to lucide imports and insert nav item between Export and AI Settings:

Add to imports: `Inbox`

Insert between Export and AI Settings:
```typescript
{ href: "/drafts", label: "Suggestions", icon: Inbox },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/drafts/drafts-inbox.tsx "src/app/(app)/drafts/page.tsx" src/components/layout/sidebar.tsx
git commit -m "feat: add suggestions inbox page with filter tabs"
```

---

### Task 8: Review page with diff

**Files:**
- Create: `src/components/drafts/draft-diff.tsx`
- Create: `src/components/drafts/draft-review-view.tsx`
- Create: `src/app/(app)/drafts/[id]/page.tsx`

- [ ] **Step 1: Create diff renderer**

```tsx
// src/components/drafts/draft-diff.tsx

import { Badge } from "@/components/ui/badge";

type FieldDiff = {
  field: string;
  current: string;
  proposed: string;
};

export function DraftFieldDiff({ diffs }: { diffs: FieldDiff[] }) {
  if (diffs.length === 0) return null;

  return (
    <div className="space-y-2">
      {diffs.map((d) => (
        <div key={d.field} className="rounded-md border p-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{d.field}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded bg-red-50/50 p-2 dark:bg-red-950/20">
              <p className="mb-0.5 text-[10px] font-medium text-red-600">Current</p>
              <p className="text-xs">{d.current || "—"}</p>
            </div>
            <div className="rounded bg-green-50/50 p-2 dark:bg-green-950/20">
              <p className="mb-0.5 text-[10px] font-medium text-green-600">Proposed</p>
              <p className="text-xs">{d.proposed || "—"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CriteriaPreview({
  criteria,
  variant = "add",
}: {
  criteria: Array<{ group: string; category: string; value: string; intent: string; importance?: number }>;
  variant?: "add" | "remove";
}) {
  const bgClass = variant === "add"
    ? "border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10"
    : "border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10";

  return (
    <div className={`space-y-1 rounded-md border p-3 ${bgClass}`}>
      {criteria.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px]">{c.intent}</Badge>
          <span className="font-medium">{c.category}</span>
          <span className="text-muted-foreground">{c.value}</span>
          {c.importance && <span className="text-muted-foreground">({c.importance}/10)</span>}
        </div>
      ))}
    </div>
  );
}

export function PersonaPreview({
  personas,
  variant = "add",
}: {
  personas: Array<{ name: string; description?: string }>;
  variant?: "add" | "remove";
}) {
  const bgClass = variant === "add"
    ? "border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10"
    : "border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10";

  return (
    <div className={`space-y-1 rounded-md border p-3 ${bgClass}`}>
      {personas.map((p, i) => (
        <div key={i} className="text-xs">
          <span className="font-medium">{p.name}</span>
          {p.description && <span className="text-muted-foreground"> — {p.description}</span>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create review view component**

```tsx
// src/components/drafts/draft-review-view.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { approveDraft, rejectDraft } from "@/actions/drafts";
import { DraftFieldDiff, CriteriaPreview, PersonaPreview } from "./draft-diff";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Loader2,
  Target,
  Package,
  Layers,
} from "lucide-react";

type DraftData = {
  id: string;
  source: string;
  targetType: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  summary: string;
  reasoning: string | null;
  status: string;
  createdAt: Date;
};

type CurrentData = {
  product?: Record<string, unknown> | null;
  icp?: Record<string, unknown> | null;
};

const TYPE_LABELS: Record<string, string> = {
  create_icp: "New ICP",
  update_product: "Update Product",
  update_icp: "Update ICP",
  create_segment: "New Segment",
};

export function DraftReviewView({
  draft,
  current,
}: {
  draft: DraftData;
  current: CurrentData;
}) {
  const router = useRouter();
  const [isApproving, startApprove] = useTransition();
  const [isRejecting, startReject] = useTransition();
  const isPending = draft.status !== "pending";

  function handleApprove() {
    startApprove(async () => {
      const result = await approveDraft(draft.id);
      if (!result.error) router.push("/drafts");
    });
  }

  function handleReject() {
    startReject(async () => {
      const result = await rejectDraft(draft.id);
      if (!result.error) router.push("/drafts");
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/drafts" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to suggestions
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{draft.summary}</h1>
          <Badge variant="outline" className="capitalize">{draft.status}</Badge>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[draft.targetType] ?? draft.targetType}</Badge>
          <span>from {draft.source}</span>
          <span>&middot;</span>
          <span>{draft.createdAt.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Reasoning */}
      {draft.reasoning && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Why this was suggested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{draft.reasoning}</p>
          </CardContent>
        </Card>
      )}

      {/* Diff section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Proposed changes</CardTitle>
        </CardHeader>
        <CardContent>
          <DraftDiffByType draft={draft} current={current} />
        </CardContent>
      </Card>

      {/* Actions */}
      {!isPending ? (
        <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
          {draft.status === "applied" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {draft.status === "rejected" && <XCircle className="h-4 w-4 text-red-500" />}
          This suggestion was {draft.status}.
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button onClick={handleApprove} disabled={isApproving || isRejecting}>
            {isApproving ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Applying...</>
            ) : (
              <><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve &amp; Apply</>
            )}
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isApproving || isRejecting}>
            {isRejecting ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Rejecting...</>
            ) : (
              <><XCircle className="mr-1.5 h-4 w-4" />Reject</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Type-specific diff rendering ────────────────────────────────────────────

function DraftDiffByType({ draft, current }: { draft: DraftData; current: CurrentData }) {
  const p = draft.payload;

  switch (draft.targetType) {
    case "create_icp": {
      const criteria = (p.criteria as Array<Record<string, unknown>>) ?? [];
      const personas = (p.personas as Array<Record<string, unknown>>) ?? [];
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{p.name as string}</p>
            {p.description && <p className="text-xs text-muted-foreground">{p.description as string}</p>}
          </div>
          {criteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Criteria</p>
              <CriteriaPreview criteria={criteria as Array<{ group: string; category: string; value: string; intent: string; importance?: number }>} />
            </div>
          )}
          {personas.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Personas</p>
              <PersonaPreview personas={personas as Array<{ name: string; description?: string }>} />
            </div>
          )}
        </div>
      );
    }

    case "update_product": {
      const cur = (current.product ?? {}) as Record<string, unknown>;
      const diffs = Object.entries(p)
        .filter(([, v]) => v !== undefined)
        .map(([key, proposed]) => ({
          field: key,
          current: formatValue(cur[key]),
          proposed: formatValue(proposed),
        }))
        .filter((d) => d.current !== d.proposed);
      return <DraftFieldDiff diffs={diffs} />;
    }

    case "update_icp": {
      const addCriteria = (p.addCriteria as Array<Record<string, unknown>>) ?? [];
      const removeCriteria = (p.removeCriteria as Array<Record<string, unknown>>) ?? [];
      const addPersonas = (p.addPersonas as Array<Record<string, unknown>>) ?? [];
      const removePersonas = (p.removePersonas as Array<Record<string, unknown>>) ?? [];

      const fieldDiffs: Array<{ field: string; current: string; proposed: string }> = [];
      const cur = (current.icp ?? {}) as Record<string, unknown>;
      if (p.name !== undefined) fieldDiffs.push({ field: "name", current: (cur.name as string) ?? "", proposed: p.name as string });
      if (p.description !== undefined) fieldDiffs.push({ field: "description", current: (cur.description as string) ?? "", proposed: p.description as string });

      return (
        <div className="space-y-4">
          {fieldDiffs.length > 0 && <DraftFieldDiff diffs={fieldDiffs} />}
          {addCriteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-700">Add criteria</p>
              <CriteriaPreview criteria={addCriteria as Array<{ group: string; category: string; value: string; intent: string; importance?: number }>} variant="add" />
            </div>
          )}
          {removeCriteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-red-700">Remove criteria</p>
              <CriteriaPreview criteria={(removeCriteria as Array<{ category: string; value: string }>).map((c) => ({ ...c, group: "", intent: "" }))} variant="remove" />
            </div>
          )}
          {addPersonas.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-700">Add personas</p>
              <PersonaPreview personas={addPersonas as Array<{ name: string; description?: string }>} variant="add" />
            </div>
          )}
          {removePersonas.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-red-700">Remove personas</p>
              <PersonaPreview personas={removePersonas as Array<{ name: string }>} variant="remove" />
            </div>
          )}
        </div>
      );
    }

    case "create_segment":
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{p.name as string}</p>
          {p.description && <p className="text-xs text-muted-foreground">{p.description as string}</p>}
          <p className="text-xs text-muted-foreground">Linked to ICP: {p.icpId as string}</p>
        </div>
      );

    default:
      return <pre className="text-xs">{JSON.stringify(p, null, 2)}</pre>;
  }
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}
```

- [ ] **Step 3: Create review page (server)**

```tsx
// src/app/(app)/drafts/[id]/page.tsx
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { drafts, productContext, icps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DraftReviewView } from "@/components/drafts/draft-review-view";

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [draft] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, id), eq(drafts.workspaceId, ctx.workspaceId)));

  if (!draft) notFound();

  // Load current data for diff rendering
  let currentProduct: Record<string, unknown> | null = null;
  let currentIcp: Record<string, unknown> | null = null;

  if (draft.targetType === "update_product") {
    const [pc] = await db
      .select()
      .from(productContext)
      .where(eq(productContext.workspaceId, ctx.workspaceId));
    if (pc) {
      currentProduct = {
        companyName: pc.companyName,
        website: pc.website,
        productDescription: pc.productDescription,
        targetCustomers: pc.targetCustomers,
        coreUseCases: pc.coreUseCases,
        keyValueProps: pc.keyValueProps,
        industriesFocus: pc.industriesFocus,
        geoFocus: pc.geoFocus,
        pricingModel: pc.pricingModel,
        avgTicket: pc.avgTicket,
      };
    }
  }

  if (draft.targetType === "update_icp" && draft.targetId) {
    const [icp] = await db
      .select()
      .from(icps)
      .where(and(eq(icps.id, draft.targetId), eq(icps.workspaceId, ctx.workspaceId)));
    if (icp) {
      currentIcp = { name: icp.name, description: icp.description };
    }
  }

  return (
    <DraftReviewView
      draft={{
        id: draft.id,
        source: draft.source,
        targetType: draft.targetType,
        targetId: draft.targetId,
        payload: draft.payload as Record<string, unknown>,
        summary: draft.summary,
        reasoning: draft.reasoning,
        status: draft.status,
        createdAt: draft.createdAt,
      }}
      current={{ product: currentProduct, icp: currentIcp }}
    />
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/drafts/draft-diff.tsx src/components/drafts/draft-review-view.tsx "src/app/(app)/drafts/[id]/page.tsx"
git commit -m "feat: add draft review page with diff preview and approve/reject"
```

---

### Task 9: API token management in AI Settings

**Files:**
- Modify: `src/app/(app)/settings/ai/page.tsx`
- Modify: `src/components/settings/ai-settings-form.tsx`

- [ ] **Step 1: Pass api_token to AI settings form**

In `src/app/(app)/settings/ai/page.tsx`, add workspace query and pass token. Add import for `workspaces` from schema and `getWorkspaceShareInfo` pattern.

After existing queries, add:
```typescript
import { workspaces } from "@/db/schema";

// Inside the function, after usage query:
const [ws] = await db
  .select({ apiToken: workspaces.apiToken })
  .from(workspaces)
  .where(eq(workspaces.id, ctx.workspaceId));
```

Pass to form:
```tsx
<AiSettingsForm
  existingKey={safeKey}
  usage={usage}
  apiToken={ws?.apiToken ?? null}
/>
```

- [ ] **Step 2: Add API token card to AI settings form**

In `src/components/settings/ai-settings-form.tsx`, add the `apiToken` prop and a new card at the bottom (before the product settings link). The card shows:
- If no token: "Generate API token" button
- If token: masked display + Copy + Regenerate buttons
- Endpoint URL and usage note

Add to props type:
```typescript
apiToken: string | null;
```

Add the card component using `generateApiToken` from `@/actions/drafts` and clipboard copy pattern from existing code.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/settings/ai/page.tsx" src/components/settings/ai-settings-form.tsx
git commit -m "feat: add API token management to AI Settings page"
```

---

### Task 10: Apply migration + verify + deploy

- [ ] **Step 1: Apply migration to database**

Create and run migration script (same pattern as previous migrations):

```javascript
// scripts/migrate-drafts.mjs
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  source text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  payload jsonb NOT NULL,
  summary text NOT NULL,
  reasoning text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  applied_at timestamp with time zone
)`;

await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS api_token text`;

const [existing] = await sql`SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_api_token_unique'`;
if (!existing) {
  await sql`ALTER TABLE workspaces ADD CONSTRAINT workspaces_api_token_unique UNIQUE (api_token)`;
}

console.log("Done: drafts table created, api_token added to workspaces");
await sql.end();
```

Run: `node scripts/migrate-drafts.mjs`
Then delete the script.

- [ ] **Step 2: Full TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Lint check**

Run: `pnpm lint`
Expected: no new errors

- [ ] **Step 4: Push to deploy**

```bash
git push origin main
```

- [ ] **Step 5: Smoke test**

After deploy, verify:
1. `/drafts` inbox page loads (empty state)
2. `/drafts/import` paste UI loads, parses valid JSON, creates drafts
3. `/drafts/[id]` review page shows diff and approve/reject buttons
4. Approve works — creates real entity
5. Reject works — marks as rejected
6. AI Settings page shows API token section
7. `POST /api/drafts` with bearer token creates drafts
8. "Suggestions" appears in sidebar
