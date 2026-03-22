import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIndustrySuggestions } from "@/lib/queries/deals";
import { createCompanyPage } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";

export default async function NewCompanyPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const industrySuggestions = await getIndustrySuggestions(ctx.workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Company</h1>
        <p className="text-muted-foreground">Add a new company to your workspace</p>
      </div>
      <CompanyForm action={createCompanyPage} industrySuggestions={industrySuggestions} />
    </div>
  );
}
