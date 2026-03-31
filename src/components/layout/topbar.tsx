import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { db } from "@/db";
import { memberships, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import Link from "next/link";

export async function Topbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? user?.email?.[0]?.toUpperCase() ?? "?";

  // Load user's workspaces for the switcher
  const ctx = await getAuthContext();
  let currentWorkspace = { id: "", name: "Workspace" };
  let allWorkspaces: { id: string; name: string }[] = [];

  if (user && ctx) {
    const userMemberships = await db
      .select({
        workspaceId: memberships.workspaceId,
        workspaceName: workspaces.name,
      })
      .from(memberships)
      .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
      .where(eq(memberships.userId, user.id));

    allWorkspaces = userMemberships.map((m) => ({
      id: m.workspaceId,
      name: m.workspaceName,
    }));

    currentWorkspace = allWorkspaces.find((ws) => ws.id === ctx.workspaceId) ?? allWorkspaces[0] ?? currentWorkspace;
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <WorkspaceSwitcher current={currentWorkspace} workspaces={allWorkspaces} />

      <DropdownMenu>
        <DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted outline-none">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">
                {user?.user_metadata?.full_name ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOut}>
            <DropdownMenuItem
              render={<button type="submit" className="w-full" />}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
