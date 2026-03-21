import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewDealPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New Deal</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 4</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Deal creation form with company/contact linking will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
