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
import { PROPERTY_OPTIONS, CONDITION_LABELS } from "@/lib/constants";

const CUSTOM_PROPERTY = "__custom__";

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

function findPropertyOption(category: string) {
  return PROPERTY_OPTIONS.find((p) => p.category === category);
}

export function CriterionFormDialog({
  icpId,
  defaultValues,
  defaultGroup,
  open,
  onOpenChange,
}: CriterionFormDialogProps) {
  const existingProperty = defaultValues
    ? findPropertyOption(defaultValues.category)
    : null;

  const [property, setProperty] = useState(
    existingProperty ? defaultValues!.category : CUSTOM_PROPERTY
  );
  const [customCategory, setCustomCategory] = useState(
    existingProperty ? "" : (defaultValues?.category ?? "")
  );
  const [condition, setCondition] = useState(
    defaultValues?.operator ?? "equals"
  );
  const [intent, setIntent] = useState(defaultValues?.intent ?? "qualify");

  // Derive group from property selection
  const selectedOption = PROPERTY_OPTIONS.find((p) => p.category === property);
  const resolvedGroup = selectedOption?.group ?? defaultGroup ?? "firmographic";
  const resolvedCategory =
    property === CUSTOM_PROPERTY ? customCategory : property;

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
            {defaultValues ? "Edit Rule" : "Add Rule"}
          </DialogTitle>
          <DialogDescription>
            Define a rule for your ideal customer profile.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="icpId" value={icpId} />
          <input type="hidden" name="group" value={resolvedGroup} />
          <input type="hidden" name="category" value={resolvedCategory} />
          <input type="hidden" name="operator" value={condition} />
          <input type="hidden" name="intent" value={intent} />

          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {/* Property */}
          <div className="space-y-2">
            <Label>Property</Label>
            <Select
              value={property}
              onValueChange={(val) => {
                if (val) setProperty(val);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {property === CUSTOM_PROPERTY
                    ? "Custom property"
                    : (selectedOption?.label ?? property)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.category}
                    value={opt.category}
                    label={opt.label}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_PROPERTY} label="Custom property">
                  Custom property...
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom property input */}
          {property === CUSTOM_PROPERTY && (
            <div className="space-y-2">
              <Label htmlFor="crit-custom-category">Property name</Label>
              <Input
                id="crit-custom-category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. App Store presence, Web traffic"
                required
              />
            </div>
          )}

          {/* Condition */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select
              value={condition}
              onValueChange={(val) => {
                if (val) setCondition(val);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {CONDITION_LABELS[condition] ?? condition}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} label={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="crit-value">Value</Label>
            <Input
              id="crit-value"
              name="value"
              placeholder="e.g. FinTech, iGaming, EU"
              defaultValue={defaultValues?.value ?? ""}
              required
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple values with commas.
            </p>
          </div>

          {/* Intent */}
          <div className="space-y-2">
            <Label>This rule means</Label>
            <Select
              value={intent}
              onValueChange={(val) => {
                if (val) setIntent(val);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {intent === "qualify" ? "Good fit" : intent === "risk" ? "Risk / Needs review" : "Not a fit"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualify" label="Good fit">
                  ✅ Good fit — defines your ICP
                </SelectItem>
                <SelectItem value="risk" label="Risk / Needs review">
                  ⚠️ Risk / Needs review — borderline, requires attention
                </SelectItem>
                <SelectItem value="exclude" label="Not a fit">
                  ❌ Not a fit — disqualifies the company
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weight — only for qualify and risk */}
          {intent !== "exclude" && (
            <div className="space-y-2">
              <Label htmlFor="crit-weight">Importance (1-10)</Label>
              <Input
                id="crit-weight"
                name="weight"
                type="number"
                min={1}
                max={10}
                defaultValue={defaultValues?.weight ?? 5}
              />
              <p className="text-xs text-muted-foreground">
                How important is this rule? 1 = nice to have, 10 = must have.
              </p>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="crit-note">Note (optional)</Label>
            <Textarea
              id="crit-note"
              name="note"
              placeholder="e.g. We win 80% of deals in this segment"
              defaultValue={defaultValues?.note ?? ""}
              rows={2}
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
                  : "Add rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
