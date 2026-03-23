import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getScoredUpload, getScoredLeads } from "@/lib/queries/scoring";
import { getIcpsForSelect } from "@/lib/queries/icps";
import { generateClusterDraft } from "@/lib/cluster-draft";
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

  const allLeads = await getScoredLeads(id, ctx.workspaceId);
  const clusterLeads = allLeads.filter(
    (l) =>
      l.fitLevel === "none" &&
      l.industry?.toLowerCase() === industry.toLowerCase(),
  );

  if (clusterLeads.length === 0) notFound();

  const existingIcps = await getIcpsForSelect(ctx.workspaceId);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <ClusterReview
        draft={draft}
        uploadId={id}
        uploadName={upload.fileName}
      />
    </div>
  );
}
