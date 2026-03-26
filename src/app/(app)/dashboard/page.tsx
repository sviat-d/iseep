import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { workspaces, icps, criteria, personas } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getIcpOverview } from "@/lib/queries/dashboard";
import { getProductContext } from "@/lib/queries/product-context";
import { getRecentActivity as getActivityEvents } from "@/lib/queries/activity";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getParsedContext } from "@/actions/onboarding";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  // onboardingStep already fetched in getAuthContext — no extra query
  if (ctx.onboardingStep < 3) {
    if (ctx.onboardingStep === 0) {
      return <OnboardingWizard step={0} />;
    }

    // Step 1: Clarify — need parsed context
    if (ctx.onboardingStep === 1) {
      const parsedContext = await getParsedContext();
      return <OnboardingWizard step={1} parsedContext={parsedContext} />;
    }

    // Step 2: Reveal — need product + ALL ICPs
    if (ctx.onboardingStep === 2) {
      const productCtx = await getProductContext(ctx.workspaceId);
      const { inArray } = await import("drizzle-orm");

      const activeIcps = await db
        .select()
        .from(icps)
        .where(
          and(
            eq(icps.workspaceId, ctx.workspaceId),
            eq(icps.status, "active"),
          ),
        )
        .orderBy(desc(icps.createdAt));

      const icpIds = activeIcps.map(i => i.id);
      const [allCriteria, allPersonas] = icpIds.length > 0
        ? await Promise.all([
            db.select().from(criteria).where(inArray(criteria.icpId, icpIds)),
            db.select().from(personas).where(inArray(personas.icpId, icpIds)),
          ])
        : [[], []];

      const revealData = {
        product: {
          companyName: productCtx?.companyName ?? null,
          productDescription: productCtx?.productDescription ?? "",
          coreUseCases: (productCtx?.coreUseCases as string[]) ?? [],
          keyValueProps: (productCtx?.keyValueProps as string[]) ?? [],
          industriesFocus: (productCtx?.industriesFocus as string[]) ?? [],
          geoFocus: (productCtx?.geoFocus as string[]) ?? [],
        },
        icps: activeIcps.map(icp => {
          const icpCriteria = allCriteria.filter(c => c.icpId === icp.id);
          const icpPersonas = allPersonas.filter(p => p.icpId === icp.id);
          return {
            id: icp.id,
            name: icp.name,
            description: icp.description,
            criteriaCount: icpCriteria.length,
            personaCount: icpPersonas.length,
            qualifyCriteria: icpCriteria
              .filter(c => c.intent === "qualify")
              .map(c => ({ category: c.category, value: c.value })),
            riskCriteria: icpCriteria
              .filter(c => c.intent === "risk")
              .map(c => ({ category: c.category, value: c.value })),
            excludeCriteria: icpCriteria
              .filter(c => c.intent === "exclude")
              .map(c => ({ category: c.category, value: c.value })),
            personas: icpPersonas.map(p => ({ name: p.name })),
          };
        }),
      };

      return <OnboardingWizard step={2} revealData={revealData} />;
    }
  }

  // Onboarding complete — ICP-focused dashboard
  const [icpOverview, productCtx, activityEvents] = await Promise.all([
    getIcpOverview(ctx.workspaceId),
    getProductContext(ctx.workspaceId),
    getActivityEvents(ctx.workspaceId),
  ]);

  return (
    <DashboardView
      icps={icpOverview}
      hasProductContext={productCtx !== null}
      activityEvents={activityEvents}
      currentUserId={ctx.userId}
    />
  );
}
