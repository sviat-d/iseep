import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getScoredUpload,
  getScoredLeads,
  getScoredLeadStats,
} from "@/lib/queries/scoring";
import { getProductContext } from "@/lib/queries/product-context";
import { db } from "@/db";
import { criteria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { evaluateCluster } from "@/lib/cluster-evaluation";
import type { ClusterEvaluation } from "@/lib/cluster-evaluation";
import { ScoringResults } from "@/components/scoring/scoring-results";

export default async function ScoringResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const upload = await getScoredUpload(id, ctx.workspaceId);
  if (!upload) notFound();

  const [leads, stats, productCtx, allCriteria] = await Promise.all([
    getScoredLeads(id, ctx.workspaceId),
    getScoredLeadStats(id, ctx.workspaceId),
    getProductContext(ctx.workspaceId),
    db.select().from(criteria).where(eq(criteria.workspaceId, ctx.workspaceId)),
  ]);

  // Compute cluster evaluations server-side
  const unmatchedLeads = leads.filter((l) => l.fitLevel === "none");
  const byIndustry: Record<string, typeof leads> = {};
  for (const lead of unmatchedLeads) {
    const key = lead.industry || "Unknown";
    if (!byIndustry[key]) byIndustry[key] = [];
    byIndustry[key].push(lead);
  }

  const clusterEvaluations: Record<string, ClusterEvaluation> = {};
  for (const [industry, clusterLeads] of Object.entries(byIndustry)) {
    const countries = [
      ...new Set(
        clusterLeads
          .map((l) => l.country)
          .filter((c): c is string => Boolean(c?.trim()))
      ),
    ];
    clusterEvaluations[industry] = evaluateCluster(
      industry,
      countries,
      allCriteria,
      productCtx,
    );
  }

  return (
    <ScoringResults
      upload={upload}
      leads={leads}
      stats={stats}
      clusterEvaluations={clusterEvaluations}
      hasProductContext={productCtx !== null}
      productDescription={productCtx?.productDescription}
    />
  );
}
