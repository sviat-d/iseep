import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Persona Detail</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 2</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detail view for persona <code>{id}</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
