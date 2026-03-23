import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getScoredUploads, getBulkUploadStats } from "@/lib/queries/scoring";
import { ScoringList } from "@/components/scoring/scoring-list";
import { SampleDataTrigger } from "@/components/scoring/sample-data-trigger";
import { Upload } from "lucide-react";

export default async function ScoringPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const uploads = await getScoredUploads(ctx.workspaceId);

  const uploadStats = await getBulkUploadStats(
    uploads.map((u) => u.id),
    ctx.workspaceId,
  );

  return (
    <div className="space-y-6">
      <Suspense>
        <SampleDataTrigger />
      </Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Score Leads</h1>
          <p className="text-muted-foreground">
            Upload a lead list and score it against your ICPs
          </p>
        </div>
        <Link
          href="/scoring/upload"
          className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Upload CSV
        </Link>
      </div>
      <ScoringList uploads={uploads} uploadStats={uploadStats} />
    </div>
  );
}
