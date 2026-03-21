import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewSegmentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New Segment</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 3</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Visual segment builder with condition groups will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
