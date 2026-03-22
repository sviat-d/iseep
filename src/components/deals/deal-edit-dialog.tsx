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
import { updateDeal } from "@/actions/deals";
import type { ActionResult } from "@/lib/types";
import { Pencil } from "lucide-react";

type DealEditDialogProps = {
  deal: {
    id: string;
    title: string;
    companyId: string;
    icpId: string | null;
    stage: string | null;
    outcome: string;
    dealValue: string | null;
    currency: string | null;
    notes: string | null;
  };
};

const STAGE_OPTIONS = [
  { value: "discovery", label: "Discovery" },
  { value: "qualification", label: "Qualification" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed", label: "Closed" },
];

const OUTCOME_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGE_OPTIONS.map((s) => [s.value, s.label])
);
const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.value, o.label])
);

export function DealEditDialog({ deal }: DealEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(deal.stage ?? "discovery");
  const [outcome, setOutcome] = useState(deal.outcome);

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await updateDeal(deal.id, formData);
    if (result.success) {
      setOpen(false);
    }
    return result;
  }, null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>
              Update deal details, stage, and outcome.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="companyId" value={deal.companyId} />
            <input type="hidden" name="icpId" value={deal.icpId ?? ""} />
            <input type="hidden" name="stage" value={stage} />
            <input type="hidden" name="outcome" value={outcome} />

            {state?.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-deal-title">Title</Label>
              <Input
                id="edit-deal-title"
                name="title"
                defaultValue={deal.title}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={stage} onValueChange={(v) => { if (v) setStage(v); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {STAGE_LABELS[stage] ?? stage}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} label={s.label}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select value={outcome} onValueChange={(v) => { if (v) setOutcome(v); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {OUTCOME_LABELS[outcome] ?? outcome}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-deal-value">Deal Value</Label>
                <Input
                  id="edit-deal-value"
                  name="dealValue"
                  type="number"
                  defaultValue={deal.dealValue ?? ""}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deal-currency">Currency</Label>
                <Input
                  id="edit-deal-currency"
                  name="currency"
                  defaultValue={deal.currency ?? "USD"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-deal-notes">Notes</Label>
              <Textarea
                id="edit-deal-notes"
                name="notes"
                defaultValue={deal.notes ?? ""}
                rows={3}
              />
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
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
