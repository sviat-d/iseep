import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { ImportIcpWizard } from "@/components/icps/import-icp-wizard";

export default async function ImportIcpPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import ICP</h1>
        <p className="text-muted-foreground">
          Paste your ICP description and we'll structure it automatically
        </p>
      </div>
      <ImportIcpWizard />
    </div>
  );
}
