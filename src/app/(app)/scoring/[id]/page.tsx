import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getScoredUpload,
  getScoredLeads,
  getScoredLeadStats,
} from "@/lib/queries/scoring";
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

  const [leads, stats] = await Promise.all([
    getScoredLeads(id, ctx.workspaceId),
    getScoredLeadStats(id, ctx.workspaceId),
  ]);

  return <ScoringResults upload={upload} leads={leads} stats={stats} />;
}
