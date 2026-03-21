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
import { createCriterion, updateCriterion } from "@/actions/criteria";
import type { ActionResult } from "@/lib/types";

type CriterionFormDialogProps = {
  icpId: string;
  defaultValues?: {
    id: string;
    group: string;
    category: string;
    operator: string | null;
    value: string;
    intent: string;
    weight: number | null;
    note: string | null;
  };
  defaultGroup?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CriterionFormDialog({
  icpId,
  defaultValues,
  defaultGroup,
  open,
  onOpenChange,
}: CriterionFormDialogProps) {
  const [intent, setIntent] = useState(defaultValues?.intent ?? "qualify");

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    let result: ActionResult;
    if (defaultValues) {
      result = await updateCriterion(defaultValues.id, formData);
    } else {
      result = await createCriterion(formData);
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
            {defaultValues ? "Edit Criterion" : "Add Criterion"}
          </DialogTitle>
          <DialogDescription>
            Define a qualification or exclusion criterion.
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
            <Label htmlFor="crit-group">Group</Label>
            <Select
              name="group"
              defaultValue={
                defaultValues?.group ?? defaultGroup ?? "firmographic"
              }
            >
              <SelectTrigger className="w-full" id="crit-group">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="firmographic">Firmographic</SelectItem>
                <SelectItem value="technographic">Technographic</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-category">Category</Label>
            <Input
              id="crit-category"
              name="category"
              placeholder="e.g. Industry, Company Size"
              defaultValue={defaultValues?.category ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-operator">Operator</Label>
            <Select
              name="operator"
              defaultValue={defaultValues?.operator ?? "equals"}
            >
              <SelectTrigger className="w-full" id="crit-operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="gt">Greater than</SelectItem>
                <SelectItem value="lt">Less than</SelectItem>
                <SelectItem value="in">In</SelectItem>
                <SelectItem value="not_in">Not in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-value">Value</Label>
            <Input
              id="crit-value"
              name="value"
              placeholder="e.g. SaaS, 50-200"
              defaultValue={defaultValues?.value ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-intent">Intent</Label>
            <Select
              name="intent"
              defaultValue={intent}
              onValueChange={(val) => { if (val) setIntent(val); }}
            >
              <SelectTrigger className="w-full" id="crit-intent">
                <SelectValue placeholder="Select intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualify">Qualify</SelectItem>
                <SelectItem value="exclude">Exclude</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {intent === "qualify" && (
            <div className="space-y-2">
              <Label htmlFor="crit-weight">Weight (1-10)</Label>
              <Input
                id="crit-weight"
                name="weight"
                type="number"
                min={1}
                max={10}
                defaultValue={defaultValues?.weight ?? 5}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="crit-note">Note</Label>
            <Textarea
              id="crit-note"
              name="note"
              placeholder="Optional note..."
              defaultValue={defaultValues?.note ?? ""}
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
