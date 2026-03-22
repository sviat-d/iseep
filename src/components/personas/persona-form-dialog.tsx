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
import { createPersona, updatePersona } from "@/actions/personas";
import type { ActionResult } from "@/lib/types";

type PersonaFormDialogProps = {
  icpId: string;
  defaultValues?: {
    id: string;
    name: string;
    description: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PersonaFormDialog({
  icpId,
  defaultValues,
  open,
  onOpenChange,
}: PersonaFormDialogProps) {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    let result: ActionResult;
    if (defaultValues) {
      result = await updatePersona(defaultValues.id, formData);
    } else {
      result = await createPersona(formData);
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
            {defaultValues ? "Edit Persona" : "Add Persona"}
          </DialogTitle>
          <DialogDescription>
            Define a buyer persona for this ICP.
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
            <Label htmlFor="persona-name">Job Title</Label>
            <Input
              id="persona-name"
              name="name"
              placeholder="e.g. VP of Engineering, Head of Payments"
              defaultValue={defaultValues?.name ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-description">Description</Label>
            <Textarea
              id="persona-description"
              name="description"
              placeholder="Describe this persona..."
              defaultValue={defaultValues?.description ?? ""}
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
