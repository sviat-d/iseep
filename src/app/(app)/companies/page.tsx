import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getCompanies } from "@/lib/queries/deals";
import { CompanyList } from "@/components/companies/company-list";
import { Plus } from "lucide-react";

export default async function CompaniesPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const companies = await getCompanies(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Manage companies and their contacts</p>
        </div>
        <Link
          href="/companies/new"
          className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Company
        </Link>
      </div>
      <CompanyList companies={companies} />
    </div>
  );
}
