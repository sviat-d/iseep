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
import { createDealReason } from "@/actions/deal-reasons";
import type { ActionResult } from "@/lib/types";
import { Plus } from "lucide-react";

const REASON_TYPE_OPTIONS = [
  { value: "win", label: "Win" },
  { value: "loss", label: "Loss" },
  { value: "objection", label: "Objection" },
  { value: "general", label: "General" },
];

const REASON_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REASON_TYPE_OPTIONS.map((r) => [r.value, r.label])
);

export function DealReasonDialog({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false);
  const [reasonType, setReasonType] = useState("general");

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await createDealReason(formData);
    if (result.success) {
      setOpen(false);
      setReasonType("general");
    }
    return result;
  }, null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3 w-3" />
        Add Reason
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Deal Reason</DialogTitle>
            <DialogDescription>
              Capture a win, loss, objection, or general reason for this deal.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="reasonType" value={reasonType} />

            {state?.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={reasonType} onValueChange={(v) => { if (v) setReasonType(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {REASON_TYPE_LABELS[reasonType] ?? reasonType}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REASON_TYPE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} label={r.label}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason-category">Category</Label>
              <Input
                id="reason-category"
                name="category"
                placeholder="e.g. pricing, compliance, product fit"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason-tag">Tag</Label>
              <Input
                id="reason-tag"
                name="tag"
                placeholder="e.g. too_expensive, missing_feature"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason-description">Description (optional)</Label>
              <Textarea
                id="reason-description"
                name="description"
                placeholder="Details about this reason..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason-severity">Severity (1-5)</Label>
              <Input
                id="reason-severity"
                name="severity"
                type="number"
                min={1}
                max={5}
                placeholder="1-5"
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
                {isPending ? "Adding..." : "Add Reason"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
