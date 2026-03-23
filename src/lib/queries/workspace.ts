import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkspaceShareInfo(workspaceId: string) {
  const [ws] = await db
    .select({
      profileShareToken: workspaces.profileShareToken,
      profileShareMode: workspaces.profileShareMode,
      profileSharedIcpIds: workspaces.profileSharedIcpIds,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  return ws ?? null;
}
