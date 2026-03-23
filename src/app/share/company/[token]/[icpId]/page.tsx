import { notFound } from "next/navigation";
import Link from "next/link";
import { getSharedCompanyIcp } from "@/lib/queries/company-profile";
import { SharedIcpView } from "@/components/shared/shared-icp-view";
import { ArrowLeft } from "lucide-react";

export default async function CompanyIcpDetailPage({
  params,
}: {
  params: Promise<{ token: string; icpId: string }>;
}) {
  const { token, icpId } = await params;
  const data = await getSharedCompanyIcp(token, icpId);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <span className="text-xl font-bold tracking-tight">iseep</span>
        <span className="ml-2 text-sm text-muted-foreground">
          {data.companyName} — ICP Profile
        </span>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href={`/share/company/${token}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {data.companyName}
        </Link>
        <SharedIcpView icp={data.icp} />
      </main>
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Powered by iseep — GTM intelligence for B2B teams
      </footer>
    </div>
  );
}
