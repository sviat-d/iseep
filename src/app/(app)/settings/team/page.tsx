import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getTeamData } from "@/actions/team";
import { TeamSettings } from "@/components/settings/team-settings";

export default async function TeamSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const data = await getTeamData();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace members and invitations
        </p>
      </div>
      <TeamSettings
        members={data.members ?? []}
        pendingInvites={data.pendingInvites ?? []}
        currentUserId={ctx.userId}
        isOwner={ctx.role === "owner"}
      />
    </div>
  );
}
