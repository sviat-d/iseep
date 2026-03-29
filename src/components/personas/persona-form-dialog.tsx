"use client";

import { useState, useActionState } from "react";
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
import { savePersonaAsTemplate } from "@/actions/templates";
import type { ActionResult } from "@/lib/types";
import { Bookmark } from "lucide-react";

type PersonaFormDialogProps = {
  icpId: string;
  defaultValues?: {
    id: string;
    name: string;
    description: string | null;
    goals: string | null;
    painPoints: string | null;
    triggers: string | null;
    decisionCriteria: string | null;
    objections: string | null;
    desiredOutcome: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFromTemplate?: boolean;
};

const PERSONA_FIELDS = [
  {
    section: "Goals & Pain",
    fields: [
      {
        name: "goals",
        label: "Goals / objectives",
        helper: "What this person wants to achieve",
        placeholder: "e.g., Reduce operational costs, scale to new markets",
      },
      {
        name: "painPoints",
        label: "Pain points / frustrations",
        helper: "What problems or risks they experience",
        placeholder: "e.g., Slow payouts, compliance blockers, manual processes",
      },
    ],
  },
  {
    section: "Triggers & Decision",
    fields: [
      {
        name: "triggers",
        label: "What makes them start looking",
        helper: "What usually happens that makes this person search for a solution?",
        placeholder: "e.g., Scaling issues, current provider failing, rising costs",
      },
      {
        name: "decisionCriteria",
        label: "What matters when choosing a solution",
        helper: "What factors influence their decision between providers?",
        placeholder: "e.g., Price, compliance, speed, integrations, support",
      },
    ],
  },
  {
    section: "Objections & Outcome",
    fields: [
      {
        name: "objections",
        label: "Objections / reasons not to buy",
        helper: "Why they might not proceed",
        placeholder: "e.g., Too expensive, security concerns, integration effort",
      },
      {
        name: "desiredOutcome",
        label: "Desired outcome",
        helper: "What success looks like for them",
        placeholder: "e.g., Fully automated payouts across 10+ countries in 6 months",
      },
    ],
  },
] as const;

export function PersonaFormDialog({
  icpId,
  defaultValues,
  open,
  onOpenChange,
  isFromTemplate,
}: PersonaFormDialogProps) {
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const isEditing = defaultValues && defaultValues.id !== "";

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    let result: ActionResult;
    if (isEditing) {
      result = await updatePersona(defaultValues.id, formData);
    } else {
      result = await createPersona(formData);
    }
    if (result.success) {
      onOpenChange(false);
      setTemplateSaved(false);
    }
    return result;
  }, null);

  async function handleSaveAsTemplate() {
    setTemplateSaving(true);
    const form = document.getElementById("persona-form") as HTMLFormElement;
    if (!form) return;
    const formData = new FormData(form);
    const result = await savePersonaAsTemplate(formData);
    setTemplateSaving(false);
    if (result.success) setTemplateSaved(true);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTemplateSaved(false); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Persona" : isFromTemplate ? "New Persona from Template" : "Add Persona"}
          </DialogTitle>
          <DialogDescription>
            {isFromTemplate
              ? "Template copied here. Adjust fields as needed before saving."
              : "Define a buyer persona with their decision-making context."}
          </DialogDescription>
        </DialogHeader>
        <form id="persona-form" action={formAction} className="space-y-5">
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
              placeholder="Brief overview of this persona..."
              defaultValue={defaultValues?.description ?? ""}
              rows={2}
            />
          </div>

          {PERSONA_FIELDS.map((section) => (
            <div key={section.section} className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.section}
              </div>
              {section.fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label htmlFor={`persona-${field.name}`} className="text-sm">
                    {field.label}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {field.helper}
                  </p>
                  <Textarea
                    id={`persona-${field.name}`}
                    name={field.name}
                    placeholder={field.placeholder}
                    defaultValue={
                      defaultValues?.[field.name as keyof typeof defaultValues] ?? ""
                    }
                    rows={2}
                  />
                </div>
              ))}
            </div>
          ))}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSaveAsTemplate}
              disabled={templateSaving || templateSaved}
              className="mr-auto text-xs"
            >
              <Bookmark className="mr-1 h-3 w-3" />
              {templateSaved ? "Saved as template" : templateSaving ? "Saving..." : "Save as template"}
            </Button>
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
                  : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
