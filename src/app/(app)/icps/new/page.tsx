import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcpsForSelect } from "@/lib/queries/icps";
import { createIcp } from "@/actions/icps";
import { IcpForm } from "@/components/icps/icp-form";

export default async function NewIcpPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const existingIcps = await getIcpsForSelect(ctx.workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create ICP</h1>
        <p className="text-muted-foreground">
          Define a new Ideal Customer Profile
        </p>
      </div>
      <IcpForm action={createIcp} existingIcps={existingIcps} />
    </div>
  );
}
