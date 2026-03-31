"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateCompanyInfo } from "@/actions/company";
import type { ActionResult } from "@/lib/types";

type WorkspaceSettingsFormProps = {
  workspace: {
    id: string;
    name: string;
    website: string | null;
    companyDescription: string | null;
    targetCustomers: string | null;
    industriesFocus: string[];
    geoFocus: string[];
  };
  isOwner: boolean;
};

export function WorkspaceSettingsForm({ workspace, isOwner }: WorkspaceSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => updateCompanyInfo(formData),
    null,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Workspace</h2>
        <p className="text-sm text-muted-foreground">
          Manage your workspace name and company information
        </p>
      </div>

      <form action={formAction} className="space-y-4 max-w-lg">
        {state?.error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-700 dark:text-green-400">
            Workspace updated
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input
            id="ws-name"
            name="name"
            defaultValue={workspace.name}
            required
            disabled={!isOwner}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ws-website">Website</Label>
          <Input
            id="ws-website"
            name="website"
            placeholder="https://company.com"
            defaultValue={workspace.website ?? ""}
            disabled={!isOwner}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ws-description">Company description</Label>
          <Textarea
            id="ws-description"
            name="companyDescription"
            placeholder="What does your company do?"
            defaultValue={workspace.companyDescription ?? ""}
            rows={3}
            disabled={!isOwner}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ws-customers">Target customers</Label>
          <Textarea
            id="ws-customers"
            name="targetCustomers"
            placeholder="Who are your ideal customers?"
            defaultValue={workspace.targetCustomers ?? ""}
            rows={2}
            disabled={!isOwner}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ws-industries">Industries focus</Label>
          <Input
            id="ws-industries"
            name="industriesFocus"
            placeholder="Fintech, Crypto, E-commerce"
            defaultValue={workspace.industriesFocus.join(", ")}
            disabled={!isOwner}
          />
          <p className="text-[11px] text-muted-foreground">Comma-separated</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ws-geo">Geographic focus</Label>
          <Input
            id="ws-geo"
            name="geoFocus"
            placeholder="EU, LATAM, US"
            defaultValue={workspace.geoFocus.join(", ")}
            disabled={!isOwner}
          />
          <p className="text-[11px] text-muted-foreground">Comma-separated</p>
        </div>

        {isOwner ? (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Only the workspace owner can edit these settings.
          </p>
        )}
      </form>
    </div>
  );
}
