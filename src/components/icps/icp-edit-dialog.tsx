"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateIcp } from "@/actions/icps";
import type { ActionResult } from "@/lib/types";
import { Pencil } from "lucide-react";

type IcpEditDialogProps = {
  icp: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    parentIcpId?: string | null;
  };
};

export function IcpEditDialog({ icp }: IcpEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(icp.status);

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await updateIcp(icp.id, formData);
    if (result.success) {
      setOpen(false);
    }
    return result;
  }, null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit ICP</DialogTitle>
            <DialogDescription>
              Update name, description, or status.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={icp.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={icp.description ?? ""}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <input type="hidden" name="status" value={status} />
              <Select
                value={status}
                onValueChange={(val) => { if (val) setStatus(val); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{status}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" label="Draft">Draft</SelectItem>
                  <SelectItem value="active" label="Active">Active</SelectItem>
                  <SelectItem value="archived" label="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
