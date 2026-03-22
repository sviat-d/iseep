import { getAuthContext } from "@/lib/auth";
import { notFound } from "next/navigation";
import { UploadWizard } from "@/components/scoring/upload-wizard";

export default async function UploadPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload & Score</h1>
        <p className="text-muted-foreground">
          Upload a CSV lead list and map columns to score against your ICPs
        </p>
      </div>
      <UploadWizard />
    </div>
  );
}
