"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonaCard } from "@/components/personas/persona-card";
import { PersonaFormDialog } from "@/components/personas/persona-form-dialog";
import { Plus, FileText } from "lucide-react";

type Persona = {
  id: string;
  name: string;
  description: string | null;
  goals: string | null;
  painPoints: string | null;
  triggers: string | null;
  decisionCriteria: string | null;
  objections: string | null;
  desiredOutcome: string | null;
  icpId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type PersonaTemplateItem = {
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

export function PersonaList({
  personas,
  icpId,
  personaTemplates = [],
}: {
  personas: Persona[];
  icpId: string;
  personaTemplates?: PersonaTemplateItem[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [templatePrefill, setTemplatePrefill] = useState<PersonaTemplateItem | null>(null);

  function handleAdd() {
    setEditingPersona(null);
    setTemplatePrefill(null);
    setDialogOpen(true);
  }

  function handleEdit(persona: Persona) {
    setEditingPersona(persona);
    setTemplatePrefill(null);
    setDialogOpen(true);
  }

  function handleUseTemplate(template: PersonaTemplateItem) {
    setEditingPersona(null);
    setTemplatePrefill(template);
    setTemplatePickerOpen(false);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          Personas ({personas.length})
        </h3>
        <div className="flex items-center gap-2">
          {personaTemplates.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTemplatePickerOpen(!templatePickerOpen)}>
              <FileText className="mr-1 h-3 w-3" />
              Use template
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="mr-1 h-3 w-3" />
            Create manually
          </Button>
        </div>
      </div>

      {/* Template picker */}
      {templatePickerOpen && personaTemplates.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Use a saved persona as a starting point for this ICP. Templates are copied here and can be adjusted before saving.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {personaTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleUseTemplate(t)}
                className="flex items-start gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="font-medium">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {personas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No personas defined yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onEdit={() => handleEdit(persona)}
            />
          ))}
        </div>
      )}

      <PersonaFormDialog
        icpId={icpId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={
          editingPersona
            ? {
                id: editingPersona.id,
                name: editingPersona.name,
                description: editingPersona.description,
                goals: editingPersona.goals,
                painPoints: editingPersona.painPoints,
                triggers: editingPersona.triggers,
                decisionCriteria: editingPersona.decisionCriteria,
                objections: editingPersona.objections,
                desiredOutcome: editingPersona.desiredOutcome,
              }
            : templatePrefill
              ? {
                  id: "",
                  name: templatePrefill.name,
                  description: templatePrefill.description,
                  goals: templatePrefill.goals,
                  painPoints: templatePrefill.painPoints,
                  triggers: templatePrefill.triggers,
                  decisionCriteria: templatePrefill.decisionCriteria,
                  objections: templatePrefill.objections,
                  desiredOutcome: templatePrefill.desiredOutcome,
                }
              : undefined
        }
        isFromTemplate={!!templatePrefill}
      />
    </div>
  );
}
