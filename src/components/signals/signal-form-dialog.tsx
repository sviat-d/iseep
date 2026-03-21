"use client";

import { useActionState } from "react";
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
import { createSignal, updateSignal } from "@/actions/signals";
import type { ActionResult } from "@/lib/types";

type SignalFormDialogProps = {
  icpId: string;
  defaultValues?: {
    id: string;
    type: string;
    label: string;
    description: string | null;
    strength: number | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SignalFormDialog({
  icpId,
  defaultValues,
  open,
  onOpenChange,
}: SignalFormDialogProps) {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    let result: ActionResult;
    if (defaultValues) {
      result = await updateSignal(defaultValues.id, formData);
    } else {
      result = await createSignal(formData);
    }
    if (result.success) {
      onOpenChange(false);
    }
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {defaultValues ? "Edit Signal" : "Add Signal"}
          </DialogTitle>
          <DialogDescription>
            Define a buying signal for this ICP.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="icpId" value={icpId} />

          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="signal-type">Type</Label>
            <Select
              name="type"
              defaultValue={defaultValues?.type ?? "positive"}
            >
              <SelectTrigger className="w-full" id="signal-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signal-label">Label</Label>
            <Input
              id="signal-label"
              name="label"
              placeholder="e.g. Visited pricing page"
              defaultValue={defaultValues?.label ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signal-description">Description</Label>
            <Textarea
              id="signal-description"
              name="description"
              placeholder="Describe this signal..."
              defaultValue={defaultValues?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signal-strength">Strength (1-10)</Label>
            <Input
              id="signal-strength"
              name="strength"
              type="number"
              min={1}
              max={10}
              defaultValue={defaultValues?.strength ?? 5}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : defaultValues
                  ? "Update"
                  : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
