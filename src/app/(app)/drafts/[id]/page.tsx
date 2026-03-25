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
