"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workspaces, icps, criteria, personas, products, productIcps } from "@/db/schema";
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
      const { getAiConfig } = await import("@/lib/ai-client");
      const config = await getAiConfig(ctx.workspaceId);
      if (!config.apiKey) {
        return { error: "AI is not configured. Please add your API key in AI Settings (/settings/ai) or ask your workspace owner to set up the platform key." };
      }
      return { error: "Could not parse your context. Please try adding more detail." };
    }

    // Save COMPANY info to workspaces table
    const product = parsed.product;
    await db
      .update(workspaces)
      .set({
        onboardingStep: 1,
        name: product.companyName || undefined,
        companyDescription: product.productDescription || null,
        targetCustomers: product.targetCustomers || null,
        industriesFocus: product.industriesFocus,
        geoFocus: product.geoFocus,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    // Cache parsed context for Step 2
    _parsedContextCache.set(ctx.workspaceId, parsed);

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

  const cached = _parsedContextCache.get(ctx.workspaceId);
  if (cached) return cached;

  // Fallback: reconstruct from workspace data
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));

  if (!ws) return null;

  return {
    product: {
      companyName: ws.name,
      productDescription: ws.companyDescription ?? "",
      targetCustomers: ws.targetCustomers,
      coreUseCases: [],
      keyValueProps: [],
      industriesFocus: (ws.industriesFocus as string[]) ?? [],
      geoFocus: (ws.geoFocus as string[]) ?? [],
    },
    icps: [{
      name: "Auto-generated ICP",
      description: "",
      criteria: [],
      personas: [],
    }],
    missingQuestions: [],
    confidence: "low",
  };
}

// ─── 4. Refine Context + Create ICPs (Step 2 → Step 3) ──────────────────────

export async function refineContext(
  answers: Record<string, string>,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  try {
    let parsed: ParsedContext | null | undefined = _parsedContextCache.get(ctx.workspaceId);
    if (!parsed) {
      parsed = await getParsedContext();
    }

    if (!parsed) {
      return { error: "No parsed context found. Please go back and provide your context again." };
    }

    // Refine with AI if user provided answers
    const hasAnswers = Object.values(answers).some((v) => v.trim());
    if (hasAnswers && parsed) {
      const refined = await refineOnboardingContext(parsed, answers, ctx.workspaceId);
      if (refined) parsed = refined;
    }

    // Update COMPANY info on workspaces
    const product = parsed.product;
    await db
      .update(workspaces)
      .set({
        name: product.companyName || undefined,
        companyDescription: product.productDescription || null,
        targetCustomers: product.targetCustomers || null,
        industriesFocus: product.industriesFocus,
        geoFocus: product.geoFocus,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    // Create or get default PRODUCT
    let [defaultProduct] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.workspaceId, ctx.workspaceId))
      .limit(1);

    if (!defaultProduct) {
      [defaultProduct] = await db.insert(products).values({
        workspaceId: ctx.workspaceId,
        name: product.companyName || "Default Product",
        description: product.productDescription || null,
        coreUseCases: product.coreUseCases,
        keyValueProps: product.keyValueProps,
      }).returning({ id: products.id });
    } else {
      // Update existing product with parsed data
      await db.update(products).set({
        description: product.productDescription || null,
        coreUseCases: product.coreUseCases,
        keyValueProps: product.keyValueProps,
        updatedAt: new Date(),
      }).where(eq(products.id, defaultProduct.id));
    }

    // Create ACTIVE ICPs and link to product
    const { logActivity } = await import("@/lib/activity");

    for (const icpData of parsed.icps) {
      const [newIcp] = await db
        .insert(icps)
        .values({
          workspaceId: ctx.workspaceId,
          name: icpData.name || "ICP",
          description: icpData.description || null,
          status: "active",
          version: 1,
          createdBy: ctx.userId,
        })
        .returning();

      // Link ICP to product via many-to-many
      await db.insert(productIcps).values({
        workspaceId: ctx.workspaceId,
        productId: defaultProduct.id,
        icpId: newIcp.id,
      });

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

      await logActivity(ctx.workspaceId, ctx.userId, {
        eventType: "icp_created",
        entityType: "icp",
        entityId: newIcp.id,
        summary: `Created ICP "${newIcp.name}" from onboarding`,
      });
    }

    // Advance to step 2 (reveal)
    await db
      .update(workspaces)
      .set({ onboardingStep: 2, updatedAt: new Date() })
      .where(eq(workspaces.id, ctx.workspaceId));

    _parsedContextCache.delete(ctx.workspaceId);

    revalidatePath("/dashboard");
    revalidatePath("/icps");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to create your profile: ${msg}` };
  }
}
