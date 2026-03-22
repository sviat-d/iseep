import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcpsForSelect } from "@/lib/queries/icps";
import { createSegment } from "@/actions/segments";
import { SegmentForm } from "@/components/segments/segment-form";

export default async function NewSegmentPage({
  searchParams,
}: {
  searchParams: Promise<{ icpId?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const icps = await getIcpsForSelect(ctx.workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Segment</h1>
        <p className="text-muted-foreground">
          Define a new audience segment within an ICP
        </p>
      </div>
      <SegmentForm
        action={createSegment}
        icps={icps}
        defaultIcpId={params.icpId}
      />
    </div>
  );
}
