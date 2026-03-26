"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { updateProductFull } from "@/actions/products";

type ProductData = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  coreUseCases: unknown;
  keyValueProps: unknown;
  pricingModel: string | null;
  avgTicket: string | null;
};

function joinArray(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

export function ProductEditForm({ product }: { product: ProductData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateProductFull(product.id, formData);
      router.push(`/icps?product=${product.id}`);
    });
  }

  return (
    <Card>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Product name *</label>
              <Input name="name" defaultValue={product.name} required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Short description</label>
              <Input
                name="shortDescription"
                defaultValue={product.shortDescription ?? ""}
                placeholder="Shown in product selector"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Product description</label>
            <Textarea
              name="description"
              defaultValue={product.description ?? ""}
              rows={3}
              placeholder="What does this product/solution do?"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Use cases</label>
            <p className="text-xs text-muted-foreground">Comma-separated</p>
            <Input
              name="coreUseCases"
              defaultValue={joinArray(product.coreUseCases)}
              placeholder="Cross-border payouts, Merchant settlements, ..."
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Value propositions</label>
            <p className="text-xs text-muted-foreground">Comma-separated</p>
            <Input
              name="keyValueProps"
              defaultValue={joinArray(product.keyValueProps)}
              placeholder="Low fees, Fast settlement, ..."
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Pricing model</label>
              <Input
                name="pricingModel"
                defaultValue={product.pricingModel ?? ""}
                placeholder="e.g., Per transaction"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Average ticket</label>
              <Input
                name="avgTicket"
                defaultValue={product.avgTicket ?? ""}
                placeholder="e.g., $5,000/mo"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
