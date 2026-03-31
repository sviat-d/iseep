"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";
import { switchWorkspace } from "@/actions/team";

type Workspace = {
  id: string;
  name: string;
};

export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: Workspace;
  workspaces: Workspace[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSwitch(workspaceId: string) {
    if (workspaceId === current.id) return;
    startTransition(async () => {
      await switchWorkspace(workspaceId);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted outline-none transition-colors"
        disabled={isPending}
      >
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[180px]">{current.name}</span>
        {workspaces.length > 1 && (
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </DropdownMenuTrigger>
      {workspaces.length > 1 && (
        <DropdownMenuContent align="start" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">Workspaces</p>
          </div>
          <DropdownMenuSeparator />
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => handleSwitch(ws.id)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{ws.name}</span>
              {ws.id === current.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
