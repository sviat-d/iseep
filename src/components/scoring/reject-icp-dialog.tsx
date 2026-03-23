"use client";

import { useState, useTransition } from "react";
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
import { rejectSuggestedIcp } from "@/actions/reject-icp";
import { Ban } from "lucide-react";

type RejectIcpDialogProps = {
  industry: string;
  onRejected?: () => void;
};

const REASON_OPTIONS = [
  { value: "licensing", label: "Licensing / regulatory restrictions" },
  { value: "no_product_fit", label: "Our product doesn't solve their needs" },
  { value: "too_small", label: "Market too small / not worth pursuing" },
  { value: "compliance", label: "Compliance / legal blockers" },
  { value: "competition", label: "Market too competitive" },
  { value: "other", label: "Other reason" },
];

export function RejectIcpDialog({ industry, onRejected }: RejectIcpDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    if (!reason) return;
    startTransition(async () => {
      const selectedLabel = REASON_OPTIONS.find(r => r.value === reason)?.label ?? reason;
      await rejectSuggestedIcp(industry, selectedLabel, details || undefined);
      setOpen(false);
      setReason("");
      setDetails("");
      onRejected?.();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Ban className="mr-1 h-3.5 w-3.5" />
        Not a fit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Not a fit: {industry}</DialogTitle>
            <DialogDescription>
              Tell us why this segment doesn&apos;t fit your business. iseep will learn and stop suggesting similar segments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <div className="space-y-1">
                {REASON_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => setReason(opt.value)}
                    className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${
                      reason === opt.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reject-details">Additional context (optional)</Label>
              <Textarea
                id="reject-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. We can't onboard companies with financial licenses due to our own licensing restrictions"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !reason}
            >
              {isPending ? "Saving..." : "Mark as not a fit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
