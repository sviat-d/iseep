import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";

export default async function WorkspaceSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));

  if (!ws) notFound();

  return (
    <WorkspaceSettingsForm
      workspace={{
        id: ws.id,
        name: ws.name,
        website: ws.website,
        companyDescription: ws.companyDescription,
        targetCustomers: ws.targetCustomers,
        industriesFocus: (ws.industriesFocus as string[]) ?? [],
        geoFocus: (ws.geoFocus as string[]) ?? [],
      }}
      isOwner={ctx.role === "owner"}
    />
  );
}
