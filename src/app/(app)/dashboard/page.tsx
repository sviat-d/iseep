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

    // Step 2: Reveal — need company + products + ALL ICPs
    if (ctx.onboardingStep === 2) {
      const { inArray } = await import("drizzle-orm");
      const { products: productsTable } = await import("@/db/schema");

      // Fetch workspace (company info) + all products in parallel
      const [wsRows, allProducts, activeIcps] = await Promise.all([
        db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)),
        db.select().from(productsTable).where(eq(productsTable.workspaceId, ctx.workspaceId)),
        db.select().from(icps).where(
          and(
            eq(icps.workspaceId, ctx.workspaceId),
            eq(icps.status, "active"),
          ),
        ).orderBy(desc(icps.createdAt)),
      ]);

      const ws = wsRows[0];

      const icpIds = activeIcps.map(i => i.id);
      const [allCriteria, allPersonas] = icpIds.length > 0
        ? await Promise.all([
            db.select().from(criteria).where(inArray(criteria.icpId, icpIds)),
            db.select().from(personas).where(inArray(personas.icpId, icpIds)),
          ])
        : [[], []];

      const revealData = {
        company: {
          name: ws?.name ?? null,
          website: ws?.website ?? null,
          description: ws?.companyDescription ?? null,
          targetCustomers: ws?.targetCustomers ?? null,
          industriesFocus: (ws?.industriesFocus as string[]) ?? [],
          geoFocus: (ws?.geoFocus as string[]) ?? [],
        },
        products: allProducts.map(p => ({
          name: p.name,
          shortDescription: p.shortDescription ?? null,
          description: p.description ?? "",
          coreUseCases: (p.coreUseCases as string[]) ?? [],
          keyValueProps: (p.keyValueProps as string[]) ?? [],
          pricingModel: p.pricingModel ?? null,
          avgTicket: p.avgTicket ?? null,
        })),
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
