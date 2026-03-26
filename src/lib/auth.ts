import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { memberships, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("activeWorkspaceId")?.value;

  let membership;

  if (activeWorkspaceId) {
    // Single query: try active workspace directly
    const [active] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.workspaceId, activeWorkspaceId)))
      .limit(1);

    if (active) {
      membership = active;
    } else {
      // Cookie invalid, fall back to first membership
      [membership] = await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, user.id))
        .limit(1);
    }
  } else {
    [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);
  }

  if (!membership) return null;

  // Fetch onboardingStep in same round — avoids separate query in layout
  const [ws] = await db
    .select({ onboardingStep: workspaces.onboardingStep })
    .from(workspaces)
    .where(eq(workspaces.id, membership.workspaceId))
    .limit(1);

  return {
    userId: user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
    onboardingStep: ws?.onboardingStep ?? 4,
  };
}
