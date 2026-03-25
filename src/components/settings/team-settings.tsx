"use client";

import { useState, useTransition } from "react";
import { inviteMember, removeMember, cancelInvite } from "@/actions/team";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Mail, Clock, Users } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type TeamSettingsProps = {
  members: Array<{
    id: string;
    userId: string;
    fullName: string | null;
    email: string;
    role: string;
    createdAt: Date;
  }>;
  pendingInvites: Array<{
    id: string;
    email: string;
    createdAt: Date;
  }>;
  currentUserId: string;
  isOwner: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitial(name: string | null, email: string): string {
  if (name && name.length > 0) return name[0].toUpperCase();
  return email[0].toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TeamSettings({
  members,
  pendingInvites,
  currentUserId,
  isOwner,
}: TeamSettingsProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isInviting, startInviteTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, startCancelTransition] = useTransition();

  function handleInvite() {
    setMessage(null);
    const email = inviteEmail.trim();
    if (!email) {
      setMessage({ type: "error", text: "Email is required" });
      return;
    }
    startInviteTransition(async () => {
      const result = await inviteMember(email);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `Invite sent to ${email}` });
        setInviteEmail("");
      }
    });
  }

  function handleRemove(membershipId: string) {
    setRemovingId(membershipId);
    startRemoveTransition(async () => {
      const result = await removeMember(membershipId);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      }
      setRemovingId(null);
    });
  }

  function handleCancelInvite(inviteId: string) {
    setCancellingId(inviteId);
    startCancelTransition(async () => {
      const result = await cancelInvite(inviteId);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      }
      setCancellingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Members */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Team
            <Badge variant="secondary" className="text-xs">
              {members.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {getInitial(member.fullName, member.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {member.fullName ?? member.email}
                    </p>
                    <Badge
                      variant={
                        member.role === "owner" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {member.role}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  Joined {formatDate(member.createdAt)}
                </span>
                {isOwner && member.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(member.id)}
                    disabled={isRemoving && removingId === member.id}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite section — owner only */}
      {isOwner && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Invite member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {message && (
              <div
                className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  message.type === "success"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {message.text}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInvite();
                  }}
                />
                <Button
                  onClick={handleInvite}
                  disabled={isInviting}
                  className="shrink-0"
                >
                  <Mail className="mr-1.5 h-4 w-4" />
                  {isInviting ? "Inviting..." : "Invite"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending invites — owner only */}
      {isOwner && pendingInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Pending invites
              <Badge variant="outline" className="text-xs">
                {pendingInvites.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                >
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{invite.email}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    Sent {formatDate(invite.createdAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvite(invite.id)}
                    disabled={isCancelling && cancellingId === invite.id}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    {isCancelling && cancellingId === invite.id
                      ? "Cancelling..."
                      : "Cancel"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
