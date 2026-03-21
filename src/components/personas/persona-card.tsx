"use client";

import { useTransition } from "react";
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
import { Pencil, Trash2 } from "lucide-react";

type PersonaCardProps = {
  persona: {
    id: string;
    name: string;
    description: string | null;
  };
  icpId: string;
  onEdit: () => void;
};

export function PersonaCard({ persona, icpId: _icpId, onEdit }: PersonaCardProps) {
  const [isPending, startTransition] = useTransition();

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
      {persona.description && (
        <CardContent>
          <CardDescription>{persona.description}</CardDescription>
        </CardContent>
      )}
    </Card>
  );
}
