"use client";

import { useActionState, useState, useEffect } from "react";
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
import { PROPERTY_OPTIONS } from "@/lib/constants";
import { Info } from "lucide-react";
import { IndustryPicker } from "@/components/shared/industry-picker";
import { Badge } from "@/components/ui/badge";
import { resolveIndustry, getTemplates } from "@/lib/taxonomy/lookup";

const CUSTOM_PROPERTY = "__custom__";

// Properties where "contains" makes more sense than "is"
const TEXT_PROPERTIES = new Set(["keyword", "tech_stack", "hiring_activity"]);

const IMPORTANCE_HELP: Record<string, { label: string; helper: string; tooltip: string }> = {
  qualify: {
    label: "Importance (1-10)",
    helper: "1 = weak positive signal, 5 = useful signal, 10 = core ICP requirement",
    tooltip: "How strongly this rule indicates a good ICP match.\n1 = weak signal, 10 = core requirement.",
  },
  risk: {
    label: "Risk severity (1-10)",
    helper: "1 = minor concern, 5 = noticeable risk, 10 = major risk requiring review",
    tooltip: "How serious this risk is.\n1 = small concern, 10 = major risk.",
  },
  exclude: {
    label: "Restriction strength (1-10)",
    helper: "1 = soft restriction, 5 = strong restriction, 10 = hard blocker",
    tooltip: "How strict this restriction is.\n1 = soft blocker, 10 = hard blocker.",
  },
};

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

const DEFAULT_PROPERTY = "industry";

// Remember last used property across multiple "Add rule" actions
let lastUsedProperty = DEFAULT_PROPERTY;

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

  const initialProperty = defaultValues
    ? (existingProperty ? defaultValues.category : CUSTOM_PROPERTY)
    : lastUsedProperty;

  const [intent, setIntent] = useState(defaultValues?.intent ?? "qualify");
  const [property, setProperty] = useState(initialProperty);
  const [customCategory, setCustomCategory] = useState(
    defaultValues && !existingProperty ? (defaultValues.category ?? "") : ""
  );
  const [showTooltip, setShowTooltip] = useState(false);
  const [industryValue, setIndustryValue] = useState(defaultValues?.value ?? "");

  // Reset state when defaultValues change
  useEffect(() => {
    const opt = defaultValues ? findPropertyOption(defaultValues.category) : null;
    setIntent(defaultValues?.intent ?? "qualify");
    setProperty(defaultValues ? (opt ? defaultValues.category : CUSTOM_PROPERTY) : lastUsedProperty);
    setCustomCategory(defaultValues && !opt ? (defaultValues.category ?? "") : "");
    setShowTooltip(false);
    setIndustryValue(defaultValues?.value ?? "");
  }, [defaultValues]);

  // Auto-detect operator from property type
  const resolvedCategory =
    property === CUSTOM_PROPERTY ? customCategory : property;
  const operator = TEXT_PROPERTIES.has(resolvedCategory) ? "contains" : "equals";

  // Derive group from property selection
  const selectedOption = PROPERTY_OPTIONS.find((p) => p.category === property);
  const resolvedGroup = selectedOption?.group ?? defaultGroup ?? "firmographic";

  const importanceConfig = IMPORTANCE_HELP[intent] ?? IMPORTANCE_HELP.qualify;

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
            Define what this means for your ideal customer profile.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="icpId" value={icpId} />
          <input type="hidden" name="group" value={resolvedGroup} />
          <input type="hidden" name="category" value={resolvedCategory} />
          <input type="hidden" name="operator" value={operator} />
          <input type="hidden" name="intent" value={intent} />

          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {/* 1. Rule type — FIRST */}
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
                  {intent === "qualify"
                    ? "✅ Good fit"
                    : intent === "risk"
                      ? "⚠️ Risk / Needs review"
                      : "❌ Not a fit"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualify" label="✅ Good fit">
                  ✅ Good fit — this defines your ICP
                </SelectItem>
                <SelectItem value="risk" label="⚠️ Risk / Needs review">
                  ⚠️ Risk — borderline, needs case-by-case review
                </SelectItem>
                <SelectItem value="exclude" label="❌ Not a fit">
                  ❌ Not a fit — disqualifies the company
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Property */}
          <div className="space-y-2">
            <Label>Property</Label>
            <Select
              value={property}
              onValueChange={(val) => {
                if (val) {
                  setProperty(val);
                  if (val !== CUSTOM_PROPERTY) lastUsedProperty = val;
                }
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

          {/* 3. Value */}
          <div className="space-y-2">
            <Label htmlFor="crit-value">Value</Label>
            {resolvedCategory === "industry" ? (
              <>
                <input type="hidden" name="value" value={industryValue || ""} />
                <IndustryPicker
                  value={industryValue}
                  onChange={setIndustryValue}
                  placeholder="Search industries..."
                />
                {industryValue && (() => {
                  const node = resolveIndustry(industryValue);
                  if (!node) return null;
                  const templates = getTemplates(node.id);
                  if (templates.length === 0) return null;
                  return (
                    <div className="rounded-md border border-dashed p-2.5 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Suggested criteria for {node.name}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {templates.map((t) => (
                          <Badge
                            key={`${t.category}-${t.suggestedValues[0]}`}
                            variant="outline"
                            className="text-[10px] text-muted-foreground"
                          >
                            {t.label}: {t.suggestedValues.slice(0, 2).join(", ")}
                            {t.suggestedValues.length > 2 ? "..." : ""}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Add these as separate rules after saving this one.
                      </p>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                <Input
                  id="crit-value"
                  name="value"
                  placeholder={
                    intent === "qualify"
                      ? "e.g. FinTech, iGaming, EU"
                      : intent === "risk"
                        ? "e.g. UK, USA"
                        : "e.g. sanctioned jurisdictions"
                  }
                  defaultValue={defaultValues?.value ?? ""}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple values with commas.
                </p>
              </>
            )}
          </div>

          {/* 4. Importance — with dynamic help */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="crit-weight">{importanceConfig.label}</Label>
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
              id="crit-weight"
              name="weight"
              type="number"
              min={1}
              max={10}
              defaultValue={defaultValues?.weight ?? 5}
            />
            <p className="text-xs text-muted-foreground">
              {importanceConfig.helper}
            </p>
          </div>

          {/* 5. Note */}
          <div className="space-y-2">
            <Label htmlFor="crit-note">Why this matters (optional)</Label>
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
