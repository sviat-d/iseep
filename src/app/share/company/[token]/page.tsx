import { notFound } from "next/navigation";
import { getSharedCompanyProfile } from "@/lib/queries/company-profile";
import { PublicCompanyProfile } from "@/components/shared/public-company-profile";

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const profile = await getSharedCompanyProfile(token);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <span className="text-xl font-bold tracking-tight">iseep</span>
        <span className="ml-2 text-sm text-muted-foreground">
          Company Profile
        </span>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <PublicCompanyProfile profile={profile} shareToken={token} />
      </main>
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Powered by iseep — GTM intelligence for B2B teams
      </footer>
    </div>
  );
}
