"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PersonaCard } from "@/components/personas/persona-card";
import { PersonaFormDialog } from "@/components/personas/persona-form-dialog";
import { linkPersonaToIcp } from "@/actions/personas";
import { Plus, Link as LinkIcon, Users } from "lucide-react";

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
  icpId: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type LinkedPersona = {
  linkId: string;
  personaId: string;
  name: string;
  description: string | null;
  goals: string | null;
  painPoints: string | null;
  triggers: string | null;
  decisionCriteria: string | null;
  objections: string | null;
  desiredOutcome: string | null;
  overrideData: unknown;
  isCustomized: boolean;
  icpCount: number;
};

type AvailablePersona = {
  id: string;
  name: string;
  description: string | null;
  icpCount: number;
};

export function PersonaList({
  personas,
  icpId,
  linkedPersonas = [],
  availablePersonas = [],
}: {
  personas: Persona[];
  icpId: string;
  linkedPersonas?: LinkedPersona[];
  availablePersonas?: AvailablePersona[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isPending, startTransition] = useTransition();

  // Use linked personas if available, fall back to legacy
  const useLinked = linkedPersonas.length > 0;

  function handleAdd() {
    setEditingPersona(null);
    setDialogOpen(true);
  }

  function handleEdit(persona: Persona) {
    setEditingPersona(persona);
    setDialogOpen(true);
  }

  function handleAttach(personaId: string) {
    startTransition(async () => {
      await linkPersonaToIcp(personaId, icpId);
      setAttachOpen(false);
    });
  }

  // Build persona card data — from linked or legacy
  const displayPersonas = useLinked
    ? linkedPersonas.map((lp) => ({
        id: lp.personaId,
        name: lp.name,
        description: lp.description,
        goals: lp.goals,
        painPoints: lp.painPoints,
        triggers: lp.triggers,
        decisionCriteria: lp.decisionCriteria,
        objections: lp.objections,
        desiredOutcome: lp.desiredOutcome,
        icpId,
        workspaceId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustomized: lp.isCustomized,
        icpCount: lp.icpCount,
      }))
    : personas.map((p) => ({ ...p, isCustomized: false, icpCount: 1 }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">
            Personas ({displayPersonas.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {availablePersonas.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setAttachOpen(!attachOpen)}>
              <LinkIcon className="mr-1 h-3 w-3" />
              Attach existing
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="mr-1 h-3 w-3" />
            Create new
          </Button>
        </div>
      </div>

      {/* Attach existing persona picker */}
      {attachOpen && availablePersonas.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Select a persona from the library to attach:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {availablePersonas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAttach(p.id)}
                disabled={isPending}
                className="flex items-start gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Used in {p.icpCount} {p.icpCount === 1 ? "ICP" : "ICPs"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {displayPersonas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No personas linked yet. Create a new persona or attach one from the library.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onEdit={() => handleEdit(persona as Persona)}
              badge={
                persona.icpCount > 1 ? (
                  persona.isCustomized ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Customized</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Shared</Badge>
                  )
                ) : null
              }
              sharedWarning={persona.icpCount > 1 && !persona.isCustomized}
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
            : undefined
        }
      />
    </div>
  );
}
