"use client";

import { useActionState } from "react";
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

type IcpFormProps = {
  action: (formData: FormData) => Promise<ActionResult | void>;
  existingIcps?: { id: string; name: string }[];
  defaultValues?: {
    name: string;
    description: string | null;
    status: string;
    parentIcpId: string | null;
  };
  productId?: string | null;
};

export function IcpForm({ action, existingIcps, defaultValues, productId }: IcpFormProps) {
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
          {productId && <input type="hidden" name="productId" value={productId} />}
          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Mid-Market SaaS"
              defaultValue={defaultValues?.name ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe this ICP..."
              defaultValue={defaultValues?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              defaultValue={defaultValues?.status ?? "draft"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {existingIcps && existingIcps.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parentIcpId">Parent ICP (optional)</Label>
              <Select
                name="parentIcpId"
                defaultValue={defaultValues?.parentIcpId ?? ""}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {existingIcps.map((icp) => (
                    <SelectItem key={icp.id} value={icp.id}>
                      {icp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : defaultValues
                ? "Save changes"
                : "Create ICP"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
