"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteSignal } from "@/actions/signals";
import { SignalFormDialog } from "@/components/signals/signal-form-dialog";
import { Plus, Pencil, Trash2, Circle } from "lucide-react";

type Signal = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  strength: number | null;
  icpId: string | null;
  workspaceId: string;
  personaId: string | null;
  segmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const typeColor: Record<string, string> = {
  positive: "text-green-500",
  negative: "text-red-500",
  neutral: "text-gray-400",
};

export function SignalList({
  signals,
  icpId,
}: {
  signals: Signal[];
  icpId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setEditingSignal(null);
    setDialogOpen(true);
  }

  function handleEdit(signal: Signal) {
    setEditingSignal(signal);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSignal(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Signals ({signals.length})</h3>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Add Signal
        </Button>
      </div>

      {signals.length === 0 ? (
        <div className="py-8 text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            No signals defined yet.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Signals help you identify the right timing for outreach. They represent intent, change, or trigger events.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Circle
                  className={`h-3 w-3 fill-current ${typeColor[signal.type] ?? "text-gray-400"}`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{signal.label}</span>
                    {signal.strength != null && (
                      <Badge variant="secondary">{signal.strength}/10</Badge>
                    )}
                  </div>
                  {signal.description && (
                    <p className="text-sm text-muted-foreground">
                      {signal.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleEdit(signal)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDelete(signal.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SignalFormDialog
        icpId={icpId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={
          editingSignal
            ? {
                id: editingSignal.id,
                type: editingSignal.type,
                label: editingSignal.label,
                description: editingSignal.description,
                strength: editingSignal.strength,
              }
            : undefined
        }
      />
    </div>
  );
}
