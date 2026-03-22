import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getSegments } from "@/lib/queries/segments";
import { SegmentListGrouped } from "@/components/segments/segment-list-grouped";
import { Plus } from "lucide-react";

export default async function SegmentsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const segments = await getSegments(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
          <p className="text-muted-foreground">
            Build audience segments with condition logic
          </p>
        </div>
        <Link
          href="/segments/new"
          className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Segment
        </Link>
      </div>
      <SegmentListGrouped segments={segments} />
    </div>
  );
}
