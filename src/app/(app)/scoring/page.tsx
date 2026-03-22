import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getScoredUploads } from "@/lib/queries/scoring";
import { ScoringList } from "@/components/scoring/scoring-list";
import { Upload } from "lucide-react";

export default async function ScoringPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const uploads = await getScoredUploads(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ICP Scoring</h1>
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
      <ScoringList uploads={uploads} />
    </div>
  );
}
