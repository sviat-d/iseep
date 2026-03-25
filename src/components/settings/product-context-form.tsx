"use client";

import { useActionState, useState } from "react";
import { saveProductContext } from "@/actions/product-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Ban } from "lucide-react";
import type { ActionResult } from "@/lib/types";
import { IndustryPicker } from "@/components/shared/industry-picker";

type ProductContextDefaults = {
  companyName: string | null;
  website: string | null;
  productDescription: string;
  targetCustomers: string | null;
  coreUseCases: unknown;
  keyValueProps: unknown;
  industriesFocus: unknown;
  geoFocus: unknown;
  pricingModel: string | null;
  avgTicket: string | null;
} | null;

type RejectedIndustry = {
  industry: string;
  reason: string;
};

function joinArray(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

export function ProductContextForm({
  defaultValues,
  rejectedIndustries = [],
}: {
  defaultValues: ProductContextDefaults;
  rejectedIndustries?: RejectedIndustry[];
}) {
  const [industriesFocusValue, setIndustriesFocusValue] = useState(
    joinArray(defaultValues?.industriesFocus),
  );

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await saveProductContext(formData);
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
          {state?.success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              Product context saved successfully.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="productDescription">What does your company do? *</Label>
            <Textarea
              id="productDescription"
              name="productDescription"
              placeholder="e.g. We provide crypto payment infrastructure for online businesses"
              rows={3}
              defaultValue={defaultValues?.productDescription ?? ""}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="e.g. Acme Corp"
                defaultValue={defaultValues?.companyName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                placeholder="https://..."
                defaultValue={defaultValues?.website ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetCustomers">Who are your typical customers?</Label>
            <Textarea
              id="targetCustomers"
              name="targetCustomers"
              placeholder="e.g. E-commerce platforms, iGaming operators, affiliate networks"
              rows={2}
              defaultValue={defaultValues?.targetCustomers ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coreUseCases">Core use cases</Label>
            <Input
              id="coreUseCases"
              name="coreUseCases"
              placeholder="e.g. Payment processing, Payouts, Settlements"
              defaultValue={joinArray(defaultValues?.coreUseCases)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyValueProps">Key value propositions</Label>
            <Input
              id="keyValueProps"
              name="keyValueProps"
              placeholder="e.g. Multi-currency, Low fees, Fast settlement"
              defaultValue={joinArray(defaultValues?.keyValueProps)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="space-y-2">
            <Label>Industries you focus on</Label>
            <input type="hidden" name="industriesFocus" value={industriesFocusValue} />
            <IndustryPicker
              value={industriesFocusValue}
              onChange={setIndustriesFocusValue}
              multiple
              placeholder="Select industries..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="geoFocus">Regions you focus on</Label>
            <Input
              id="geoFocus"
              name="geoFocus"
              placeholder="e.g. EU, UK, Asia"
              defaultValue={joinArray(defaultValues?.geoFocus)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricingModel">Pricing model</Label>
              <Input
                id="pricingModel"
                name="pricingModel"
                placeholder="e.g. Per-transaction, Monthly subscription"
                defaultValue={defaultValues?.pricingModel ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avgTicket">Average deal size</Label>
              <Input
                id="avgTicket"
                name="avgTicket"
                placeholder="e.g. $5,000/month"
                defaultValue={defaultValues?.avgTicket ?? ""}
              />
            </div>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>

      {/* Excluded industries section */}
      <CardContent className="border-t pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Industries marked as not a fit</Label>
          </div>
          {rejectedIndustries.length > 0 ? (
            <ul className="space-y-1.5">
              {rejectedIndustries.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span>
                    <span className="font-medium">{r.industry}</span>
                    <span className="text-muted-foreground"> &mdash; {r.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No industries excluded yet. iseep will learn from your feedback as you review suggested ICPs.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
