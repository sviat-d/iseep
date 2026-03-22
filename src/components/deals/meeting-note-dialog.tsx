"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMeetingNote } from "@/actions/meeting-notes";
import type { ActionResult } from "@/lib/types";
import { Plus } from "lucide-react";

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "notetaker", label: "Notetaker" },
  { value: "import", label: "Import" },
];

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((s) => [s.value, s.label])
);

export function MeetingNoteDialog({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState("manual");

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await createMeetingNote(formData);
    if (result.success) {
      setOpen(false);
      setSourceType("manual");
    }
    return result;
  }, null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3 w-3" />
        Add Note
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meeting Note</DialogTitle>
            <DialogDescription>
              Record a meeting note for this deal.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="sourceType" value={sourceType} />

            {state?.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note-summary">Summary</Label>
              <Textarea
                id="note-summary"
                name="summary"
                placeholder="Meeting summary..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={sourceType} onValueChange={(v) => { if (v) setSourceType(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {SOURCE_LABELS[sourceType] ?? sourceType}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} label={s.label}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
