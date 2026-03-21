import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getIcps } from "@/lib/queries/icps";
import { IcpListView } from "@/components/icps/icp-list-view";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function IcpsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const icps = await getIcps(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ICPs</h1>
          <p className="text-muted-foreground">
            Define and manage your Ideal Customer Profiles
          </p>
        </div>
        <Link href="/icps/new" className={cn(buttonVariants())}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create ICP
        </Link>
      </div>
      <IcpListView icps={icps} />
    </div>
  );
}
