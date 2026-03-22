import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getSegment } from "@/lib/queries/segments";
import { SegmentDetail } from "@/components/segments/segment-detail";

export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const segment = await getSegment(id, ctx.workspaceId);
  if (!segment) notFound();

  return <SegmentDetail segment={segment} />;
}
