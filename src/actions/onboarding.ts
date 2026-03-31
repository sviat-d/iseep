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

    // Save COMPANY info to workspaces + cache ParsedContext in DB
    const company = parsed.company;
    await db
      .update(workspaces)
      .set({
        onboardingStep: 1,
        name: company.name || undefined,
        website: company.website || undefined,
        companyDescription: company.description || null,
        targetCustomers: company.targetCustomers || null,
        industriesFocus: company.industriesFocus,
        geoFocus: company.geoFocus,
        onboardingData: parsed as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

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

  const [ws] = await db
    .select({
      onboardingData: workspaces.onboardingData,
      name: workspaces.name,
      website: workspaces.website,
      companyDescription: workspaces.companyDescription,
      targetCustomers: workspaces.targetCustomers,
      industriesFocus: workspaces.industriesFocus,
      geoFocus: workspaces.geoFocus,
    })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));

  if (!ws) return null;

  // If we have cached onboardingData, return it directly
  if (ws.onboardingData) {
    return ws.onboardingData as unknown as ParsedContext;
  }

  // Fallback: reconstruct minimal context from workspace fields
  return {
    company: {
      name: ws.name,
      website: ws.website ?? null,
      description: ws.companyDescription ?? null,
      targetCustomers: ws.targetCustomers ?? null,
      industriesFocus: (ws.industriesFocus as string[]) ?? [],
      geoFocus: (ws.geoFocus as string[]) ?? [],
    },
    products: [],
    icps: [{
      name: "Auto-generated ICP",
      description: "",
      productRefs: [],
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
    let parsed = await getParsedContext();
    if (!parsed) {
      return { error: "No parsed context found. Please go back and provide your context again." };
    }

    // Refine with AI if user provided answers
    const hasAnswers = Object.values(answers).some((v) => v.trim());
    if (hasAnswers) {
      const refined = await refineOnboardingContext(parsed, answers, ctx.workspaceId);
      if (refined) parsed = refined;
    }

    // Update COMPANY info on workspaces
    const company = parsed.company;
    await db
      .update(workspaces)
      .set({
        name: company.name || undefined,
        website: company.website || undefined,
        companyDescription: company.description || null,
        targetCustomers: company.targetCustomers || null,
        industriesFocus: company.industriesFocus,
        geoFocus: company.geoFocus,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    // Create ALL products from parsed data
    const productNameToId = new Map<string, string>();

    for (const productData of parsed.products) {
      const [newProduct] = await db.insert(products).values({
        workspaceId: ctx.workspaceId,
        name: productData.name,
        shortDescription: productData.shortDescription || null,
        description: productData.description || null,
        coreUseCases: productData.coreUseCases,
        keyValueProps: productData.keyValueProps,
        pricingModel: productData.pricingModel || null,
        avgTicket: productData.avgTicket || null,
      }).returning({ id: products.id });

      productNameToId.set(productData.name, newProduct.id);
    }

    // If no products were created (edge case), create a default
    if (productNameToId.size === 0) {
      const [defaultProduct] = await db.insert(products).values({
        workspaceId: ctx.workspaceId,
        name: company.name || "Default Product",
        description: company.description || null,
      }).returning({ id: products.id });
      productNameToId.set(company.name || "Default Product", defaultProduct.id);
    }

    const allProductIds = Array.from(productNameToId.values());

    // Create ACTIVE ICPs and link to products
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

      // Resolve product links from productRefs (names) to IDs
      let linkedProductIds: string[];
      if (icpData.productRefs.length > 0) {
        linkedProductIds = icpData.productRefs
          .map((ref) => productNameToId.get(ref))
          .filter((id): id is string => !!id);
        if (linkedProductIds.length === 0) linkedProductIds = allProductIds;
      } else {
        linkedProductIds = allProductIds;
      }

      // Link ICP to products via many-to-many
      for (const productId of linkedProductIds) {
        await db.insert(productIcps).values({
          workspaceId: ctx.workspaceId,
          productId,
          icpId: newIcp.id,
        });
      }

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
            weight: c.importance ?? (c.intent === "exclude" ? 8 : c.intent === "risk" ? 5 : 5),
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

    // Advance to step 2 (reveal) + clear onboarding cache
    await db
      .update(workspaces)
      .set({
        onboardingStep: 2,
        onboardingData: null,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, ctx.workspaceId));

    revalidatePath("/dashboard");
    revalidatePath("/icps");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to create your profile: ${msg}` };
  }
}
