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
