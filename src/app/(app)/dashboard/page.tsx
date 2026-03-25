import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { workspaces, icps, criteria, personas } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getDashboardState,
  getDashboardStats,
  getIcpHealth,
  getRecentActivity,
  getLatestScoringRun,
} from "@/lib/queries/dashboard";
import { getProductContext } from "@/lib/queries/product-context";
import { getRecentActivity as getActivityEvents } from "@/lib/queries/activity";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getParsedContext } from "@/actions/onboarding";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  // Check onboarding status
  const [workspace] = await db
    .select({ onboardingStep: workspaces.onboardingStep })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1);

  if (workspace && workspace.onboardingStep < 3) {
    // Step 0: Context input
    if (workspace.onboardingStep === 0) {
      return <OnboardingWizard step={0} />;
    }

    // Step 1: Clarify — need parsed context
    if (workspace.onboardingStep === 1) {
      const parsedContext = await getParsedContext();
      return <OnboardingWizard step={1} parsedContext={parsedContext} />;
    }

    // Step 2: Reveal — need product + ICP data
    if (workspace.onboardingStep === 2) {
      const productCtx = await getProductContext(ctx.workspaceId);

      // Get the most recently created ICP
      const [latestIcp] = await db
        .select()
        .from(icps)
        .where(
          and(
            eq(icps.workspaceId, ctx.workspaceId),
            eq(icps.status, "active"),
          ),
        )
        .orderBy(desc(icps.createdAt))
        .limit(1);

      let revealData = null;
      if (latestIcp) {
        const icpCriteria = await db
          .select()
          .from(criteria)
          .where(eq(criteria.icpId, latestIcp.id));

        const icpPersonas = await db
          .select()
          .from(personas)
          .where(eq(personas.icpId, latestIcp.id));

        revealData = {
          product: {
            companyName: productCtx?.companyName ?? null,
            productDescription: productCtx?.productDescription ?? "",
            coreUseCases: (productCtx?.coreUseCases as string[]) ?? [],
            keyValueProps: (productCtx?.keyValueProps as string[]) ?? [],
            industriesFocus: (productCtx?.industriesFocus as string[]) ?? [],
            geoFocus: (productCtx?.geoFocus as string[]) ?? [],
          },
          icp: {
            id: latestIcp.id,
            name: latestIcp.name,
            description: latestIcp.description,
            criteriaCount: icpCriteria.length,
            personaCount: icpPersonas.length,
            qualifyCriteria: icpCriteria
              .filter((c) => c.intent === "qualify")
              .map((c) => ({ category: c.category, value: c.value })),
            riskCriteria: icpCriteria
              .filter((c) => c.intent === "risk")
              .map((c) => ({ category: c.category, value: c.value })),
            excludeCriteria: icpCriteria
              .filter((c) => c.intent === "exclude")
              .map((c) => ({ category: c.category, value: c.value })),
            personas: icpPersonas.map((p) => ({ name: p.name })),
          },
        };
      }

      return <OnboardingWizard step={2} revealData={revealData} />;
    }
  }

  // Step 3+ = onboarding complete, show normal dashboard
  // Normal dashboard
  const [state, stats, icpHealth, latestRun, recentActivity, productCtx, activityEvents] =
    await Promise.all([
      getDashboardState(ctx.workspaceId),
      getDashboardStats(ctx.workspaceId),
      getIcpHealth(ctx.workspaceId),
      getLatestScoringRun(ctx.workspaceId),
      getRecentActivity(ctx.workspaceId),
      getProductContext(ctx.workspaceId),
      getActivityEvents(ctx.workspaceId),
    ]);

  return (
    <DashboardView
      state={state}
      stats={stats}
      icpHealth={icpHealth}
      latestRun={latestRun}
      recentActivity={recentActivity}
      hasProductContext={productCtx !== null}
      activityEvents={activityEvents}
      currentUserId={ctx.userId}
    />
  );
}
