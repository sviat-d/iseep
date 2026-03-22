"use client";

import { useActionState, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import type { ActionResult } from "@/lib/types";

type SegmentFormProps = {
  action: (formData: FormData) => Promise<ActionResult | void>;
  icps: { id: string; name: string }[];
  defaultValues?: {
    name: string;
    description: string | null;
    status: string;
    priorityScore: number;
    icpId: string;
  };
  defaultIcpId?: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export function SegmentForm({
  action,
  icps,
  defaultValues,
  defaultIcpId,
}: SegmentFormProps) {
  const initialIcpId = defaultValues?.icpId ?? defaultIcpId ?? "";
  const initialStatus = defaultValues?.status ?? "draft";

  const [icpId, setIcpId] = useState(initialIcpId);
  const [status, setStatus] = useState(initialStatus);

  const selectedIcp = icps.find((i) => i.id === icpId);

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await action(formData);
    return result ?? null;
  }, null);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="icpId" value={icpId} />
          <input type="hidden" name="status" value={status} />

          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label>ICP</Label>
            <Select
              value={icpId}
              onValueChange={(val) => {
                if (val) setIcpId(val);
              }}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedIcp ? selectedIcp.name : "Select an ICP"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {icps.map((icp) => (
                  <SelectItem key={icp.id} value={icp.id} label={icp.name}>
                    {icp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seg-name">Name</Label>
            <Input
              id="seg-name"
              name="name"
              placeholder="e.g. FinTech EU Segment"
              defaultValue={defaultValues?.name ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seg-description">Description</Label>
            <Textarea
              id="seg-description"
              name="description"
              placeholder="Describe this segment..."
              defaultValue={defaultValues?.description ?? ""}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(val) => {
                if (val) setStatus(val);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {STATUS_LABELS[status] ?? status}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft" label="Draft">
                  Draft
                </SelectItem>
                <SelectItem value="active" label="Active">
                  Active
                </SelectItem>
                <SelectItem value="archived" label="Archived">
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seg-priority">Priority Score (1-10)</Label>
            <Input
              id="seg-priority"
              name="priorityScore"
              type="number"
              min={1}
              max={10}
              defaultValue={defaultValues?.priorityScore ?? 5}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : defaultValues
                ? "Save changes"
                : "Create Segment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
