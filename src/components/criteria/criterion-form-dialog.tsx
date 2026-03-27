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
import { createCriterion, updateCriterion } from "@/actions/criteria";
import type { ActionResult } from "@/lib/types";
import {
  PROPERTY_OPTIONS,
  PROPERTY_GROUPS,
  BUSINESS_MODEL_PRESETS,
} from "@/lib/constants";
import { Info, Check, AlertTriangle, X, ArrowLeft } from "lucide-react";
import { IndustryPicker } from "@/components/shared/industry-picker";
import { Badge } from "@/components/ui/badge";
import { resolveIndustry, getTemplates } from "@/lib/taxonomy/lookup";

const CUSTOM_PROPERTY = "__custom__";

// Properties where "contains" makes more sense than "is"
const TEXT_PROPERTIES = new Set(["keyword", "tech_stack", "hiring_activity"]);

const IMPORTANCE_HELP: Record<string, { label: string; helper: string; tooltip: string }> = {
  qualify: {
    label: "Importance (1-10)",
    helper: "1 = weak positive signal, 5 = useful signal, 10 = core requirement",
    tooltip: "How strongly this criterion indicates a good ICP match.\n1 = weak signal, 10 = core requirement.",
  },
  risk: {
    label: "Risk severity (1-10)",
    helper: "1 = minor concern, 5 = noticeable risk, 10 = major risk",
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

function findPropertyOption(category: string) {
  return PROPERTY_OPTIONS.find((p) => p.category === category);
}

function findPropertyLabel(category: string) {
  return findPropertyOption(category)?.label ?? category;
}

export function CriterionFormDialog({
  icpId,
  defaultValues,
  defaultGroup,
  open,
  onOpenChange,
}: CriterionFormDialogProps) {
  const isEditing = !!defaultValues;

  const existingProperty = defaultValues
    ? findPropertyOption(defaultValues.category)
    : null;

  // When editing or adding from a specific group, skip the picker
  const shouldSkipPicker = isEditing || !!defaultGroup;

  const initialProperty = defaultValues
    ? (existingProperty ? defaultValues.category : CUSTOM_PROPERTY)
    : null;

  const [step, setStep] = useState<"pick" | "configure">(
    shouldSkipPicker ? "configure" : "pick"
  );
  const [intent, setIntent] = useState(defaultValues?.intent ?? "qualify");
  const [property, setProperty] = useState<string | null>(initialProperty);
  const [customCategory, setCustomCategory] = useState(
    defaultValues && !existingProperty ? (defaultValues.category ?? "") : ""
  );
  const [showTooltip, setShowTooltip] = useState(false);
  const [industryValue, setIndustryValue] = useState(defaultValues?.value ?? "");
  const [businessModelValues, setBusinessModelValues] = useState<string[]>(
    defaultValues?.category === "business_model" && defaultValues?.value
      ? defaultValues.value.split(",").map((v) => v.trim()).filter(Boolean)
      : []
  );
  const [customBusinessModel, setCustomBusinessModel] = useState("");

  // Reset state when dialog opens or defaultValues change
  useEffect(() => {
    const opt = defaultValues ? findPropertyOption(defaultValues.category) : null;
    const editing = !!defaultValues;
    const skipPicker = editing || !!defaultGroup;

    setStep(skipPicker ? "configure" : "pick");
    setIntent(defaultValues?.intent ?? "qualify");
    setProperty(
      defaultValues
        ? (opt ? defaultValues.category : CUSTOM_PROPERTY)
        : defaultGroup ? null : null
    );
    setCustomCategory(defaultValues && !opt ? (defaultValues.category ?? "") : "");
    setShowTooltip(false);
    setIndustryValue(defaultValues?.value ?? "");
    setBusinessModelValues(
      defaultValues?.category === "business_model" && defaultValues?.value
        ? defaultValues.value.split(",").map((v) => v.trim()).filter(Boolean)
        : []
    );
    setCustomBusinessModel("");
  }, [defaultValues, defaultGroup, open]);

  // Auto-detect operator from property type
  const resolvedCategory =
    property === CUSTOM_PROPERTY ? customCategory : (property ?? "");
  const operator = TEXT_PROPERTIES.has(resolvedCategory) ? "contains" : "equals";

  // Derive group from property selection
  const selectedOption = PROPERTY_OPTIONS.find((p) => p.category === property);
  const resolvedGroup = selectedOption?.group ?? defaultGroup ?? "firmographic";

  const importanceConfig = IMPORTANCE_HELP[intent] ?? IMPORTANCE_HELP.qualify;

  // Compute the value for business model
  const businessModelValue = businessModelValues.join(", ");

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

  function handlePickProperty(category: string) {
    setProperty(category);
    setStep("configure");
  }

  function handlePickCustom() {
    setProperty(CUSTOM_PROPERTY);
    setCustomCategory("");
    setStep("configure");
  }

  function handleBack() {
    setStep("pick");
  }

  function toggleBusinessModel(value: string) {
    setBusinessModelValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function addCustomBusinessModel() {
    const trimmed = customBusinessModel.trim();
    if (trimmed && !businessModelValues.includes(trimmed)) {
      setBusinessModelValues((prev) => [...prev, trimmed]);
      setCustomBusinessModel("");
    }
  }

  // Filter property groups when adding from a specific group
  const pickerGroups = defaultGroup
    ? PROPERTY_GROUPS.filter((g) => g.group === defaultGroup)
    : PROPERTY_GROUPS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "pick" ? (
          /* ── STEP 1: Criterion Picker ─────────────────────────────── */
          <>
            <DialogHeader>
              <DialogTitle>Define a criterion</DialogTitle>
              <DialogDescription>
                What do you want to define?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {pickerGroups.map((group) => (
                <div key={group.group}>
                  <div className="mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </span>
                    {group.advanced && (
                      <span className="ml-1.5 text-[10px] italic text-muted-foreground/60">
                        advanced
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.properties.map((prop) => (
                      <button
                        key={prop.category}
                        type="button"
                        onClick={() => handlePickProperty(prop.category)}
                        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        {prop.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {/* Custom criterion — always visible */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handlePickCustom}
                  className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  + Custom criterion
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── STEP 2: Configure Criterion ──────────────────────────── */
          <>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit criterion" : "Add criterion"}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? (
                  <>Editing: <span className="font-medium text-foreground">{findPropertyLabel(defaultValues!.category)}</span></>
                ) : property === CUSTOM_PROPERTY ? (
                  "Custom criterion"
                ) : (
                  <>
                    <span className="font-medium text-foreground">{findPropertyLabel(property ?? "")}</span>
                    {!defaultGroup && !isEditing && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowLeft className="h-3 w-3" />
                          Change
                        </button>
                      </>
                    )}
                  </>
                )}
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

              {/* Custom property name input */}
              {property === CUSTOM_PROPERTY && (
                <div className="space-y-2">
                  <Label htmlFor="crit-custom-category">Criterion name</Label>
                  <Input
                    id="crit-custom-category"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. App Store presence, Web traffic"
                    required
                  />
                </div>
              )}

              {/* Intent — visual buttons */}
              <div className="space-y-2">
                <Label>This criterion means</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIntent("qualify")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-colors ${
                      intent === "qualify"
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Good fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntent("risk")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-colors ${
                      intent === "risk"
                        ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Risk
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntent("exclude")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-colors ${
                      intent === "exclude"
                        ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                    Not a fit
                  </button>
                </div>
              </div>

              {/* Value — smart input based on property */}
              <div className="space-y-2">
                {resolvedCategory === "industry" ? (
                  /* Industry — taxonomy picker */
                  <>
                    <Label>Value</Label>
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
                            Add these as separate criteria after saving this one.
                          </p>
                        </div>
                      );
                    })()}
                  </>
                ) : resolvedCategory === "business_model" ? (
                  /* Business model — multi-select chips */
                  <>
                    <Label>Select business models</Label>
                    <input type="hidden" name="value" value={businessModelValue} />
                    <div className="flex flex-wrap gap-1.5">
                      {BUSINESS_MODEL_PRESETS.map((bm) => (
                        <button
                          key={bm}
                          type="button"
                          onClick={() => toggleBusinessModel(bm)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            businessModelValues.includes(bm)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {bm}
                        </button>
                      ))}
                      {/* Show custom values that aren't in presets */}
                      {businessModelValues
                        .filter((v) => !BUSINESS_MODEL_PRESETS.includes(v))
                        .map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => toggleBusinessModel(v)}
                            className="rounded-full border border-primary bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium transition-colors"
                          >
                            {v}
                          </button>
                        ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        value={customBusinessModel}
                        onChange={(e) => setCustomBusinessModel(e.target.value)}
                        placeholder="Custom..."
                        className="h-7 text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomBusinessModel();
                          }
                        }}
                      />
                      {customBusinessModel.trim() && (
                        <button
                          type="button"
                          onClick={addCustomBusinessModel}
                          className="rounded border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* Default — text input */
                  <>
                    <Label htmlFor="crit-value">Value</Label>
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

              {/* Importance — with dynamic help */}
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

              {/* Note */}
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
                    : isEditing
                      ? "Update"
                      : "Add criterion"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
