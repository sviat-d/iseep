import { notFound } from "next/navigation";
import { getSharedIcp } from "@/lib/queries/icps";
import { SharedIcpView } from "@/components/shared/shared-icp-view";

export default async function SharedIcpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const icp = await getSharedIcp(token);
  if (!icp) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <span className="text-xl font-bold tracking-tight">iseep</span>
        <span className="ml-2 text-sm text-muted-foreground">
          Shared ICP Profile
        </span>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <SharedIcpView icp={icp} />
      </main>
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Powered by iseep — GTM intelligence for B2B teams
      </footer>
    </div>
  );
}
