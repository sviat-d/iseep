"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonaCard } from "@/components/personas/persona-card";
import { PersonaFormDialog } from "@/components/personas/persona-form-dialog";
import { Plus } from "lucide-react";

type Persona = {
  id: string;
  name: string;
  description: string | null;
  icpId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

export function PersonaList({
  personas,
  icpId,
}: {
  personas: Persona[];
  icpId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  function handleAdd() {
    setEditingPersona(null);
    setDialogOpen(true);
  }

  function handleEdit(persona: Persona) {
    setEditingPersona(persona);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          Personas ({personas.length})
        </h3>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Add Persona
        </Button>
      </div>

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
              }
            : undefined
        }
      />
    </div>
  );
}
