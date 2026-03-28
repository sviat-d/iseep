"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deletePersona } from "@/actions/personas";
import { Pencil, Trash2, ChevronDown } from "lucide-react";

type PersonaCardProps = {
  persona: {
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
  onEdit: () => void;
};

const DETAIL_FIELDS = [
  { key: "goals", label: "Goals" },
  { key: "painPoints", label: "Pain points" },
  { key: "triggers", label: "What makes them look" },
  { key: "decisionCriteria", label: "Decision criteria" },
  { key: "objections", label: "Objections" },
  { key: "desiredOutcome", label: "Desired outcome" },
] as const;

export function PersonaCard({ persona, onEdit }: PersonaCardProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const hasDetails = DETAIL_FIELDS.some(
    (f) => persona[f.key as keyof typeof persona],
  );

  function handleDelete() {
    startTransition(async () => {
      await deletePersona(persona.id);
    });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{persona.name}</CardTitle>
        <CardAction>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-xs" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {persona.description && (
          <CardDescription>{persona.description}</CardDescription>
        )}
        {hasDetails && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {expanded ? "Hide" : "Show"} details
            </button>
            {expanded && (
              <div className="space-y-2 pt-1">
                {DETAIL_FIELDS.map((field) => {
                  const value =
                    persona[field.key as keyof typeof persona] as string | null;
                  if (!value) return null;
                  return (
                    <div key={field.key}>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {field.label}
                      </p>
                      <p className="text-xs text-foreground">{value}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
