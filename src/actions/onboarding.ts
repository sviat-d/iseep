"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workspaces, icps, criteria, personas, productContext } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import {
  parseOnboardingContext,
  refineOnboardingContext,
  type ParsedContext,
} from "@/lib/onboarding-parser";

// ─── 1. Advance / Go Back ──────────────────────────────────────────────────

export async function advanceOnboarding(
  step: number,
): Promise<ActionResult & { step?: number }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .update(workspaces)
    .set({ onboardingStep: step, updatedAt: new Date() })
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

export async function goBackOnboarding(
  step: number,
): Promise<ActionResult & { step?: number }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (step < 0 || step > 3) return { error: "Invalid step" };

  await db
    .update(workspaces)
    .set({ onboardingStep: step, updatedAt: new Date() })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true, step };
}

// ─── 2. Parse Context (Step 1 → Step 2) ────────────────────────────────────

// Store parsed context in memory (per-request, server-side)
// In production this should be in a session/cache, but for MVP we store in DB
let _parsedContextCache: Map<string, ParsedContext> = new Map();

export async function parseContext(
  text: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!text.trim()) return { error: "Please provide some context about your company." };

  try {
    const parsed = await parseOnboardingContext(text, ctx.workspaceId);
    if (!parsed) {
      // Check if AI key is configured
      const { getAiConfig } = await import("@/lib/ai-client");
      const config = await getAiConfig(ctx.workspaceId);
      if (!config.apiKey) {
        return { error: "AI is not configured. Please add your API key in AI Settings (/settings/ai) or ask your workspace owner to set up the platform key." };
      }
      return { error: "Could not parse your context. Please try adding more detail." };
    }

    // Store parsed context as JSON in workspace metadata for Step 2
    await db
      .update(workspaces)
      .set({
        onboardingStep: 1,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    // Store parsed context temporarily (will be used by Step 2)
    _parsedContextCache.set(ctx.workspaceId, parsed);

    // Also persist to a simple JSON column on workspaces (we'll use updatedAt trick)
    // For now, store in productContext as partial save
    // Save what we have so far to product_context
    const product = parsed.product;
    if (product.productDescription) {
      const [existing] = await db
        .select({ id: productContext.id })
        .from(productContext)
        .where(eq(productContext.workspaceId, ctx.workspaceId));

      const data = {
        workspaceId: ctx.workspaceId,
        companyName: product.companyName || null,
        productDescription: product.productDescription,
        targetCustomers: product.targetCustomers || null,
        coreUseCases: product.coreUseCases,
        keyValueProps: product.keyValueProps,
        industriesFocus: product.industriesFocus,
        geoFocus: product.geoFocus,
        updatedAt: new Date(),
      };

      if (existing) {
        await db.update(productContext).set(data).where(eq(productContext.id, existing.id));
      } else {
        await db.insert(productContext).values(data);
      }
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to analyze context: ${msg}` };
  }
}

// ─── 3. Get Parsed Context for Step 2 ──────────────────────────────────────

export async function getParsedContext(): Promise<ParsedContext | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  // Try cache first
  const cached = _parsedContextCache.get(ctx.workspaceId);
  if (cached) return cached;

  // Fallback: reconstruct from saved product context
  const [pc] = await db
    .select()
    .from(productContext)
    .where(eq(productContext.workspaceId, ctx.workspaceId));

  if (!pc) return null;

  // Return a minimal ParsedContext from saved data
  return {
    product: {
      companyName: pc.companyName,
      productDescription: pc.productDescription,
      targetCustomers: pc.targetCustomers,
      coreUseCases: (pc.coreUseCases as string[]) ?? [],
      keyValueProps: (pc.keyValueProps as string[]) ?? [],
      industriesFocus: (pc.industriesFocus as string[]) ?? [],
      geoFocus: (pc.geoFocus as string[]) ?? [],
    },
    icp: {
      name: "Auto-generated ICP",
      description: "",
      criteria: [],
      personas: [],
    },
    missingQuestions: [],
    confidence: "low",
  };
}

// ─── 4. Refine Context + Create ICP (Step 2 → Step 3) ──────────────────────

export async function refineContext(
  answers: Record<string, string>,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  try {
    // Get the parsed context
    let parsed: ParsedContext | null | undefined = _parsedContextCache.get(ctx.workspaceId);
    if (!parsed) {
      parsed = await getParsedContext();
    }

    if (!parsed) {
      return { error: "No parsed context found. Please go back and provide your context again." };
    }

    // If user provided answers, refine with AI
    const hasAnswers = Object.values(answers).some((v) => v.trim());
    if (hasAnswers && parsed) {
      const refined = await refineOnboardingContext(parsed, answers, ctx.workspaceId);
      if (refined) {
        parsed = refined;
      }
    }

    // Save updated product context
    const product = parsed.product;
    if (product.productDescription) {
      const [existing] = await db
        .select({ id: productContext.id })
        .from(productContext)
        .where(eq(productContext.workspaceId, ctx.workspaceId));

      const data = {
        workspaceId: ctx.workspaceId,
        companyName: product.companyName || null,
        productDescription: product.productDescription,
        targetCustomers: product.targetCustomers || null,
        coreUseCases: product.coreUseCases,
        keyValueProps: product.keyValueProps,
        industriesFocus: product.industriesFocus,
        geoFocus: product.geoFocus,
        updatedAt: new Date(),
      };

      if (existing) {
        await db.update(productContext).set(data).where(eq(productContext.id, existing.id));
      } else {
        await db.insert(productContext).values(data);
      }
    }

    // Create ACTIVE ICP
    const icpData = parsed.icp;
    const [newIcp] = await db
      .insert(icps)
      .values({
        workspaceId: ctx.workspaceId,
        name: icpData.name || "Primary ICP",
        description: icpData.description || null,
        status: "active", // ACTIVE, not draft!
        version: 1,
        createdBy: ctx.userId,
      })
      .returning();

    // Insert criteria
    if (icpData.criteria.length > 0) {
      await db.insert(criteria).values(
        icpData.criteria.map((c) => ({
          workspaceId: ctx.workspaceId,
          icpId: newIcp.id,
          group: c.group,
          category: c.category,
          value: c.value,
          operator: "equals" as const,
          intent: c.intent,
          weight: c.intent === "qualify" ? (c.importance ?? 5) : (c.importance ?? null),
          note: c.note || null,
        })),
      );
    }

    // Insert personas
    if (icpData.personas.length > 0) {
      await db.insert(personas).values(
        icpData.personas.map((p) => ({
          workspaceId: ctx.workspaceId,
          icpId: newIcp.id,
          name: p.name,
          description: p.description || null,
        })),
      );
    }

    // Log activity
    const { logActivity } = await import("@/lib/activity");
    await logActivity(ctx.workspaceId, ctx.userId, {
      eventType: "icp_created",
      entityType: "icp",
      entityId: newIcp.id,
      summary: `Created ICP "${newIcp.name}" from onboarding`,
    });

    // Advance to step 2 (reveal)
    await db
      .update(workspaces)
      .set({ onboardingStep: 2, updatedAt: new Date() })
      .where(eq(workspaces.id, ctx.workspaceId));

    // Clear cache
    _parsedContextCache.delete(ctx.workspaceId);

    revalidatePath("/dashboard");
    revalidatePath("/icps");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to create your profile: ${msg}` };
  }
}
