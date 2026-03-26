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
    <div className="space-y-6">
      <TeamSettings
        members={data.members ?? []}
        pendingInvites={data.pendingInvites ?? []}
        currentUserId={ctx.userId}
        isOwner={ctx.role === "owner"}
      />
    </div>
  );
}
