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
import { updateSegment } from "@/actions/segments";
import type { ActionResult } from "@/lib/types";
import { Pencil } from "lucide-react";

type SegmentEditDialogProps = {
  segment: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    priorityScore: number;
    icpId: string;
  };
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export function SegmentEditDialog({ segment }: SegmentEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(segment.status);

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await updateSegment(segment.id, formData);
    if (result.success) {
      setOpen(false);
    }
    return result;
  }, null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
            <DialogDescription>
              Update name, description, status, or priority.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="status" value={status} />

            {state?.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-seg-name">Name</Label>
              <Input
                id="edit-seg-name"
                name="name"
                defaultValue={segment.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-seg-description">Description</Label>
              <Textarea
                id="edit-seg-description"
                name="description"
                defaultValue={segment.description ?? ""}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(val) => {
                  if (val) setStatus(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {STATUS_LABELS[status] ?? status}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" label="Draft">
                    Draft
                  </SelectItem>
                  <SelectItem value="active" label="Active">
                    Active
                  </SelectItem>
                  <SelectItem value="archived" label="Archived">
                    Archived
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-seg-priority">Priority Score (1-10)</Label>
              <Input
                id="edit-seg-priority"
                name="priorityScore"
                type="number"
                min={1}
                max={10}
                defaultValue={segment.priorityScore}
              />
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
