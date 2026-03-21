import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Segment Detail</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 3</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detail view for segment <code>{id}</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
