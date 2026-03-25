import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check for active workspace cookie (multi-workspace support)
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("activeWorkspaceId")?.value;

  let membership;

  if (activeWorkspaceId) {
    // Try the active workspace first
    const [active] = await db
      .select()
      .from(memberships)
      .where(
        eq(memberships.userId, user.id),
      )
      .limit(10);

    // Find membership matching cookie, fallback to first
    const allMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id));

    membership = allMemberships.find(m => m.workspaceId === activeWorkspaceId)
      ?? allMemberships[0];
  } else {
    [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);
  }

  if (!membership) return null;

  return {
    userId: user.id,
    workspaceId: membership.workspaceId,
    role: membership.role, // "owner" | "admin" | "member"
  };
}
