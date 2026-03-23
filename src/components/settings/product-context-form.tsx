"use client";

import { useActionState } from "react";
import { saveProductContext } from "@/actions/product-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { ActionResult } from "@/lib/types";

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

function joinArray(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

export function ProductContextForm({
  defaultValues,
}: {
  defaultValues: ProductContextDefaults;
}) {
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industriesFocus">Industries you focus on</Label>
              <Input
                id="industriesFocus"
                name="industriesFocus"
                placeholder="e.g. FinTech, iGaming, E-commerce"
                defaultValue={joinArray(defaultValues?.industriesFocus)}
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
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
    </Card>
  );
}
