import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getScoredUpload, getScoredLeads } from "@/lib/queries/scoring";
import { getIcpsForSelect } from "@/lib/queries/icps";
import { getProductContext } from "@/lib/queries/product-context";
import { getRejectedIcps } from "@/actions/reject-icp";
import { generateClusterDraft } from "@/lib/cluster-draft";
import { evaluateCluster } from "@/lib/cluster-evaluation";
import { db } from "@/db";
import { criteria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ClusterReview } from "@/components/scoring/cluster-review";

export default async function ReviewClusterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ industry?: string }>;
}) {
  const { id } = await params;
  const { industry } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) notFound();
  if (!industry) notFound();

  const upload = await getScoredUpload(id, ctx.workspaceId);
  if (!upload) notFound();

  const [allLeads, existingIcps, productCtx, allCriteria, rejected] = await Promise.all([
    getScoredLeads(id, ctx.workspaceId),
    getIcpsForSelect(ctx.workspaceId),
    getProductContext(ctx.workspaceId),
    db.select().from(criteria).where(eq(criteria.workspaceId, ctx.workspaceId)),
    getRejectedIcps(ctx.workspaceId),
  ]);

  // Build excluded industries list
  const excludedIndustries = [
    ...((productCtx?.excludedIndustries as string[] | null) ?? []),
    ...rejected.map(r => r.industry),
  ];

  const clusterLeads = allLeads.filter(
    (l) =>
      l.fitLevel === "none" &&
      l.industry?.toLowerCase() === industry.toLowerCase(),
  );

  if (clusterLeads.length === 0) notFound();

  const draft = generateClusterDraft(
    industry,
    clusterLeads.map((l) => ({
      companyName: l.companyName,
      industry: l.industry,
      country: l.country,
      website: l.website,
      contactName: l.contactName,
      contactEmail: l.contactEmail,
      rawData: l.rawData as Record<string, unknown>,
    })),
    existingIcps.map((i) => i.name),
  );

  // Compute product fit evaluation
  const clusterCountries = [
    ...new Set(
      clusterLeads
        .map((l) => l.country)
        .filter((c): c is string => Boolean(c?.trim()))
    ),
  ];
  const evaluation = evaluateCluster(
    industry,
    clusterCountries,
    clusterLeads.length,
    allCriteria,
    productCtx,
    excludedIndustries,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <ClusterReview
        draft={draft}
        uploadId={id}
        uploadName={upload.fileName}
        evaluation={evaluation}
        clusterIndustry={industry}
      />
    </div>
  );
}
