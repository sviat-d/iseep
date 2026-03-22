"use client";

import { useState } from "react";
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
import { PROPERTY_OPTIONS } from "@/lib/constants";
import { Info } from "lucide-react";
import type { SegmentRule } from "@/lib/segment-helpers";

const CUSTOM_PROPERTY = "__custom__";

const IMPORTANCE_HELP: Record<
  string,
  { label: string; helper: string; tooltip: string }
> = {
  qualify: {
    label: "Importance (1-10)",
    helper:
      "1 = weak positive signal, 5 = useful signal, 10 = core ICP requirement",
    tooltip:
      "How strongly this rule indicates a good ICP match.\n1 = weak signal, 10 = core requirement.",
  },
  risk: {
    label: "Risk severity (1-10)",
    helper:
      "1 = minor concern, 5 = noticeable risk, 10 = major risk requiring review",
    tooltip: "How serious this risk is.\n1 = small concern, 10 = major risk.",
  },
  exclude: {
    label: "Restriction strength (1-10)",
    helper:
      "1 = soft restriction, 5 = strong restriction, 10 = hard blocker",
    tooltip:
      "How strict this restriction is.\n1 = soft blocker, 10 = hard blocker.",
  },
};

type SegmentRuleDialogProps = {
  intent: "qualify" | "risk" | "exclude";
  defaultValues?: SegmentRule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rule: SegmentRule) => void;
};

function findPropertyOption(category: string) {
  return PROPERTY_OPTIONS.find((p) => p.category === category);
}

/**
 * Inner form component. Gets re-mounted via `key` when the dialog opens
 * with new props, so all state resets without needing useEffect.
 */
function RuleForm({
  intent,
  defaultValues,
  onOpenChange,
  onSubmit,
}: Omit<SegmentRuleDialogProps, "open">) {
  const existingProperty = defaultValues
    ? findPropertyOption(defaultValues.property)
    : null;

  const initialProperty = defaultValues
    ? existingProperty
      ? defaultValues.property
      : CUSTOM_PROPERTY
    : "industry";

  const [property, setProperty] = useState(initialProperty);
  const [customProperty, setCustomProperty] = useState(
    defaultValues && !existingProperty ? defaultValues.property : ""
  );
  const [value, setValue] = useState(defaultValues?.value ?? "");
  const [importance, setImportance] = useState(
    defaultValues?.importance ?? 5
  );
  const [note, setNote] = useState(defaultValues?.note ?? "");
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedOption = PROPERTY_OPTIONS.find(
    (p) => p.category === property
  );
  const resolvedProperty =
    property === CUSTOM_PROPERTY ? customProperty : property;
  const importanceConfig =
    IMPORTANCE_HELP[intent] ?? IMPORTANCE_HELP.qualify;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedProperty.trim() || !value.trim()) return;
    onSubmit({
      criterionId: defaultValues?.criterionId,
      property: resolvedProperty.trim(),
      value: value.trim(),
      intent,
      importance,
      note: note.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {defaultValues ? "Edit Rule" : "Add Rule"}
        </DialogTitle>
        <DialogDescription>
          {intent === "qualify"
            ? "Define a requirement for this segment."
            : intent === "risk"
              ? "Define a risk signal for this segment."
              : "Define an exclusion rule for this segment."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Property */}
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
            <SelectContent alignItemWithTrigger={false}>
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

        {/* Custom property name */}
        {property === CUSTOM_PROPERTY && (
          <div className="space-y-2">
            <Label htmlFor="rule-custom-property">Property name</Label>
            <Input
              id="rule-custom-property"
              value={customProperty}
              onChange={(e) => setCustomProperty(e.target.value)}
              placeholder="e.g. App Store presence, Web traffic"
              required
            />
          </div>
        )}

        {/* 2. Value */}
        <div className="space-y-2">
          <Label htmlFor="rule-value">Value</Label>
          <Input
            id="rule-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              intent === "qualify"
                ? "e.g. FinTech, iGaming, EU"
                : intent === "risk"
                  ? "e.g. UK, USA"
                  : "e.g. sanctioned jurisdictions"
            }
            required
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple values with commas.
          </p>
        </div>

        {/* 3. Importance */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="rule-importance">{importanceConfig.label}</Label>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowTooltip(!showTooltip)}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          {showTooltip && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground whitespace-pre-line">
              {importanceConfig.tooltip}
            </div>
          )}
          <Input
            id="rule-importance"
            type="number"
            min={1}
            max={10}
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            {importanceConfig.helper}
          </p>
        </div>

        {/* 4. Note */}
        <div className="space-y-2">
          <Label htmlFor="rule-note">Why this matters (optional)</Label>
          <Textarea
            id="rule-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. We win 80% of deals in this segment"
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
          <Button type="submit">
            {defaultValues ? "Update" : "Add rule"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function SegmentRuleDialog({
  intent,
  defaultValues,
  open,
  onOpenChange,
  onSubmit,
}: SegmentRuleDialogProps) {
  // Build a key that changes whenever the dialog opens with different data.
  // This forces the inner RuleForm to re-mount with fresh initial state.
  const formKey = `${intent}-${defaultValues?.property ?? "new"}-${defaultValues?.value ?? ""}-${open}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <RuleForm
          key={formKey}
          intent={intent}
          defaultValues={defaultValues}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
