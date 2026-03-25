// src/app/(app)/drafts/import/page.tsx
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { DraftImportForm } from "@/components/drafts/draft-import-form";

export default async function DraftImportPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Suggestions</h1>
        <p className="text-muted-foreground">
          Paste structured JSON from Claude or another AI to create reviewable suggestions
        </p>
      </div>
      <DraftImportForm />
    </div>
  );
}
