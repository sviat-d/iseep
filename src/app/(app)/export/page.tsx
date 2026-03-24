import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { buildFullContext } from "@/lib/context-export/builders";
import { ExportPageView } from "@/components/export/export-page-view";

export default async function ExportPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const fullContext = await buildFullContext(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GTM Context Export</h1>
        <p className="text-muted-foreground">
          Share your product and ICP context with partners, AI agents, or your team
        </p>
      </div>
      <ExportPageView fullContext={fullContext} />
    </div>
  );
}
