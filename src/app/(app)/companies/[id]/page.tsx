import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getCompanyWithContacts, getIndustrySuggestions } from "@/lib/queries/deals";
import { CompanyDetail } from "@/components/companies/company-detail";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const company = await getCompanyWithContacts(id, ctx.workspaceId);
  if (!company) notFound();

  const industrySuggestions = await getIndustrySuggestions(ctx.workspaceId);

  return <CompanyDetail company={company} industrySuggestions={industrySuggestions} />;
}
