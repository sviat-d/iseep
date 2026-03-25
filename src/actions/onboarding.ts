"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workspaces, icps, criteria, personas, scoredLeads } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── 1. Advance Onboarding Step ─────────────────────────────────────────────

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

// ─── 1b. Go Back to a Previous Step ─────────────────────────────────────────

export async function goBackOnboarding(
  step: number,
): Promise<ActionResult & { step?: number }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Allow going back to any step 0-3
  if (step < 0 || step > 3) return { error: "Invalid step" };

  await db
    .update(workspaces)
    .set({ onboardingStep: step, updatedAt: new Date() })
    .where(eq(workspaces.id, ctx.workspaceId));

  revalidatePath("/dashboard");
  revalidatePath("/");

  return { success: true, step };
}

// ─── 2. Create Demo ICP (internal helper) ───────────────────────────────────

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
      workspaceId,
      icpId: icp.id,
      group: "firmographic",
      category: "industry",
      operator: "equals",
      value: "FinTech",
      intent: "qualify",
      weight: 9,
    },
    {
      workspaceId,
      icpId: icp.id,
      group: "firmographic",
      category: "region",
      operator: "equals",
      value: "EU, US",
      intent: "qualify",
      weight: 6,
    },
    {
      workspaceId,
      icpId: icp.id,
      group: "firmographic",
      category: "company_size",
      operator: "equals",
      value: "50-500",
      intent: "qualify",
      weight: 4,
    },
  ]);

  await db.insert(personas).values([
    {
      workspaceId,
      icpId: icp.id,
      name: "Head of Payments",
    },
    {
      workspaceId,
      icpId: icp.id,
      name: "CFO",
    },
  ]);

  return icp.id;
}

// ─── 3. Run Onboarding Scoring ──────────────────────────────────────────────

export async function runOnboardingScoring(): Promise<
  ActionResult & { summary?: ScoringSummary }
> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Ensure at least one ICP exists
  const existingIcps = await db
    .select({ id: icps.id })
    .from(icps)
    .where(
      and(
        eq(icps.workspaceId, ctx.workspaceId),
        inArray(icps.status, ["active", "draft"]),
      ),
    )
    .limit(1);

  if (existingIcps.length === 0) {
    await createDemoIcp(ctx.workspaceId);
  }

  // Run sample scoring
  const { processSampleData } = await import("@/actions/scoring");
  const result = await processSampleData();

  if (result.error) return { error: result.error };
  if (!result.uploadId) return { error: "Scoring completed but no upload ID returned" };

  const uploadId = result.uploadId;

  // Fetch top 20 leads ordered by fitScore DESC
  const leads = await db
    .select({
      companyName: sql<string>`${scoredLeads.rawData}->>'company_name'`,
      industry: scoredLeads.industry,
      fitLevel: scoredLeads.fitLevel,
      fitScore: scoredLeads.fitScore,
    })
    .from(scoredLeads)
    .where(eq(scoredLeads.uploadId, uploadId))
    .orderBy(sql`${scoredLeads.fitScore} desc`)
    .limit(20);

  // Count by fit level groups
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
      case "none":
      default:
        unmatched++;
        break;
    }
  }

  // Top 5 leads for the summary
  const topLeads = leads.slice(0, 5).map((lead) => ({
    companyName: lead.companyName ?? "Unknown",
    industry: lead.industry ?? "Unknown",
    fitLevel: lead.fitLevel,
    fitScore: lead.fitScore ?? 0,
  }));

  const summary: ScoringSummary = {
    highFit,
    borderline,
    blocked,
    unmatched,
    topLeads,
    uploadId,
  };

  return { success: true, summary };
}
