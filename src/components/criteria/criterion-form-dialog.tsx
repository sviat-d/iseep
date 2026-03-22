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
import { GROUP_LABELS, OPERATOR_LABELS } from "@/lib/constants";

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
            <Label htmlFor="crit-group">Category group</Label>
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
                {Object.entries(GROUP_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} label={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">What kind of factor is this?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-category">What are you measuring?</Label>
            <Input
              id="crit-category"
              name="category"
              placeholder="e.g. Industry, Company size, Region"
              defaultValue={defaultValues?.category ?? ""}
              required
            />
            <p className="text-xs text-muted-foreground">The specific property you&apos;re evaluating.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-operator">How to compare</Label>
            <Select
              name="operator"
              defaultValue={defaultValues?.operator ?? "equals"}
            >
              <SelectTrigger className="w-full" id="crit-operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATOR_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} label={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How should the value be matched?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-value">Expected value</Label>
            <Input
              id="crit-value"
              name="value"
              placeholder="e.g. FinTech, EU, 50-200 employees"
              defaultValue={defaultValues?.value ?? ""}
              required
            />
            <p className="text-xs text-muted-foreground">What this property should be (or contain) for a good fit.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crit-intent">This factor should...</Label>
            <Select
              name="intent"
              defaultValue={intent}
              onValueChange={(val) => { if (val) setIntent(val); }}
            >
              <SelectTrigger className="w-full" id="crit-intent">
                <SelectValue placeholder="Select intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualify" label="Qualify">✓ Qualify — helps define your ICP (positive fit factor)</SelectItem>
                <SelectItem value="exclude" label="Exclude">✗ Exclude — disqualifies the company (hard rule)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {intent === "qualify" && (
            <div className="space-y-2">
              <Label htmlFor="crit-weight">Importance</Label>
              <Input
                id="crit-weight"
                name="weight"
                type="number"
                min={1}
                max={10}
                defaultValue={defaultValues?.weight ?? 5}
              />
              <p className="text-xs text-muted-foreground">How much this factor matters (1 = minor, 10 = critical).</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="crit-note">Why this matters</Label>
            <Textarea
              id="crit-note"
              name="note"
              placeholder="e.g. We win most deals in this segment"
              defaultValue={defaultValues?.note ?? ""}
            />
            <p className="text-xs text-muted-foreground">Optional context for your team.</p>
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
