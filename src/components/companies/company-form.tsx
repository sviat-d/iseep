"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { ActionResult } from "@/lib/types";

type CompanyFormProps = {
  action: (formData: FormData) => Promise<ActionResult | void>;
  industrySuggestions: string[];
  defaultValues?: {
    name?: string;
    website?: string;
    country?: string;
    industry?: string;
    notes?: string;
  };
  submitLabel?: string;
};

export function CompanyForm({
  action,
  industrySuggestions,
  defaultValues,
  submitLabel = "Create Company",
}: CompanyFormProps) {
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
          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Acme Corp"
              defaultValue={defaultValues?.name}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                placeholder="https://..."
                defaultValue={defaultValues?.website}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                placeholder="e.g. US"
                defaultValue={defaultValues?.country}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              name="industry"
              list="industry-suggestions"
              placeholder="e.g. SaaS"
              defaultValue={defaultValues?.industry}
            />
            <datalist id="industry-suggestions">
              {industrySuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes..."
              rows={3}
              defaultValue={defaultValues?.notes}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
