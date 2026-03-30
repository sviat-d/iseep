"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { invites, memberships, users, workspaces } from "@/db/schema";
import { getAuthContext } from "@/lib/auth";
import { canManageTeam } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { sendEmail, inviteEmailHtml } from "@/lib/email";
import type { ActionResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// 1. Invite a new member by email
// ---------------------------------------------------------------------------

export async function inviteMember(email: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canManageTeam(ctx.role)) return { error: "Only the workspace owner can invite members" };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "Email is required" };

  // Check if the email already belongs to a workspace member
  const existingMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.workspaceId, ctx.workspaceId),
        eq(users.email, normalizedEmail),
      ),
    );

  if (existingMembers.length > 0) {
    return { error: "This user is already a member of this workspace" };
  }

  // Check for an existing pending invite for this email
  const [pendingInvite] = await db
    .select({ id: invites.id })
    .from(invites)
    .where(
      and(
        eq(invites.workspaceId, ctx.workspaceId),
        eq(invites.email, normalizedEmail),
        eq(invites.status, "pending"),
      ),
    );

  if (pendingInvite) {
    return { error: "An invite is already pending for this email" };
  }

  const token = randomBytes(32).toString("hex");

  await db.insert(invites).values({
    workspaceId: ctx.workspaceId,
    email: normalizedEmail,
    role: "member",
    invitedBy: ctx.userId,
    token,
    status: "pending",
  });

  // Get workspace name and inviter name for the email
  const [ws] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, ctx.workspaceId));
  const [inviter] = await db.select({ fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, ctx.userId));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.iseep.io";
  const inviteUrl = `${siteUrl}/invite/${token}`;

  // Send invite email (fire-and-forget — don't block on failure)
  sendEmail({
    to: normalizedEmail,
    subject: `You're invited to ${ws?.name ?? "a workspace"} on iseep`,
    html: inviteEmailHtml({
      workspaceName: ws?.name ?? "a workspace",
      inviterName: inviter?.fullName ?? inviter?.email ?? "A teammate",
      inviteUrl,
    }),
  }).catch((e) => console.error("[invite] Email send failed:", e));

  logActivity(ctx.workspaceId, ctx.userId, {
    eventType: "member_invited",
    entityType: "member",
    summary: `Invited ${normalizedEmail}`,
  });

  revalidatePath("/settings/team");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 2. Remove a member from the workspace
// ---------------------------------------------------------------------------

export async function removeMember(memberUserId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canManageTeam(ctx.role)) return { error: "Only the workspace owner can remove members" };

  if (memberUserId === ctx.userId) {
    return { error: "You cannot remove yourself from the workspace" };
  }

  await db
    .delete(memberships)
    .where(
      and(
        eq(memberships.workspaceId, ctx.workspaceId),
        eq(memberships.userId, memberUserId),
      ),
    );

  logActivity(ctx.workspaceId, ctx.userId, {
    eventType: "member_removed",
    entityType: "member",
    entityId: memberUserId,
    summary: `Removed member ${memberUserId}`,
  });

  revalidatePath("/settings/team");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 3. Cancel (expire) a pending invite
// ---------------------------------------------------------------------------

export async function cancelInvite(inviteId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canManageTeam(ctx.role)) return { error: "Only the workspace owner can cancel invites" };

  await db
    .update(invites)
    .set({ status: "expired" })
    .where(
      and(
        eq(invites.id, inviteId),
        eq(invites.workspaceId, ctx.workspaceId),
      ),
    );

  revalidatePath("/settings/team");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. Accept an invite by token (logged-in user)
// ---------------------------------------------------------------------------

export async function acceptInvite(token: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "You must be signed in to accept an invite" };

  // Find the pending invite
  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.token, token),
        eq(invites.status, "pending"),
      ),
    );

  if (!invite) {
    return { error: "Invalid or expired invite" };
  }

  // Verify the invite email matches the current user's email
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, ctx.userId));

  if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { error: "This invite was sent to a different email address" };
  }

  // Create the membership
  await db.insert(memberships).values({
    workspaceId: invite.workspaceId,
    userId: ctx.userId,
    role: invite.role,
    invitedBy: invite.invitedBy,
  });

  // Mark invite as accepted
  await db
    .update(invites)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(eq(invites.id, invite.id));

  logActivity(invite.workspaceId, ctx.userId, {
    eventType: "member_joined",
    entityType: "member",
    entityId: ctx.userId,
    summary: `Accepted invite and joined workspace`,
  });

  revalidatePath("/settings/team");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. Switch to a different workspace
// ---------------------------------------------------------------------------

export async function switchWorkspace(workspaceId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Verify the user has a membership in the target workspace
  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.userId, ctx.userId),
      ),
    );

  if (!membership) {
    return { error: "You do not have access to this workspace" };
  }

  const cookieStore = await cookies();
  cookieStore.set("activeWorkspaceId", workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. Get team data (members, pending invites, current user role)
// ---------------------------------------------------------------------------

export async function getTeamData() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" as const };

  // Members: join memberships + users for this workspace
  const members = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      createdAt: memberships.createdAt,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.workspaceId, ctx.workspaceId));

  // Pending invites for this workspace
  const pendingInvites = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.workspaceId, ctx.workspaceId),
        eq(invites.status, "pending"),
      ),
    );

  return {
    members,
    pendingInvites,
    currentUserRole: ctx.role,
  };
}
