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
import { createRequest } from "@/actions/requests";
import type { ActionResult } from "@/lib/types";
import { Plus } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "feature_request", label: "Feature Request" },
  { value: "adjacent_product", label: "Adjacent Product" },
  { value: "use_case", label: "Use Case" },
  { value: "integration_request", label: "Integration" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.label])
);

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "deal", label: "Deal" },
  { value: "meeting_note", label: "Meeting Note" },
];

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((s) => [s.value, s.label])
);

type IcpOption = { id: string; name: string };

export function RequestFormDialog({ icps }: { icps: IcpOption[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("feature_request");
  const [source, setSource] = useState("manual");
  const [icpId, setIcpId] = useState("");

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await createRequest(formData);
    if (result.success) {
      setOpen(false);
      setType("feature_request");
      setSource("manual");
      setIcpId("");
    }
    return result;
  }, null);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3 w-3" />
        Add Request
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Product Request</DialogTitle>
            <DialogDescription>
              Capture a feature request or product feedback.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="source" value={source} />
            <input type="hidden" name="icpId" value={icpId} />

            {state?.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="request-title">Title</Label>
              <Input
                id="request-title"
                name="title"
                placeholder="e.g. SSO support for enterprise"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => { if (v) setType(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {TYPE_LABELS[type] ?? type}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value} label={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-description">Description (optional)</Label>
              <Textarea
                id="request-description"
                name="description"
                placeholder="Details about this request..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>ICP (optional)</Label>
              <Select value={icpId} onValueChange={(v) => setIcpId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {icpId
                      ? icps.find((i) => i.id === icpId)?.name ?? "Select ICP"
                      : "Select ICP"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" label="None">None</SelectItem>
                  {icps.map((icp) => (
                    <SelectItem key={icp.id} value={icp.id} label={icp.name}>
                      {icp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-frequency">Frequency Score (1-10)</Label>
              <Input
                id="request-frequency"
                name="frequencyScore"
                type="number"
                min={1}
                max={10}
                placeholder="1-10"
              />
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => { if (v) setSource(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {SOURCE_LABELS[source] ?? source}
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
                {isPending ? "Creating..." : "Create Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
