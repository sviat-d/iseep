"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Package } from "lucide-react";
import { createProduct } from "@/actions/products";

type Product = {
  id: string;
  name: string;
  shortDescription: string | null;
};

export function ProductSelector({
  products,
  selectedProductId,
}: {
  products: Product[];
  selectedProductId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  function selectProduct(productId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (productId === selectedProductId) {
      params.delete("product");
    } else {
      params.set("product", productId);
    }
    router.push(`/icps?${params.toString()}`);
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.success && result.productId) {
        setShowAdd(false);
        router.push(`/icps?product=${result.productId}`);
      }
    });
  }

  // Single product — minimal UI
  if (products.length === 1 && !showAdd) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <Package className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">{products[0].name}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-full border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="mr-1 inline h-3 w-3" />
          Add product
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {products.map((p) => {
          const isSelected = p.id === selectedProductId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProduct(p.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              {p.name}
            </button>
          );
        })}
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-full border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Add product
          </button>
        )}
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <form action={handleCreate} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Product name *</label>
                <Input
                  name="name"
                  placeholder="e.g., Mass Payouts"
                  required
                  className="mt-1 h-8"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Short description</label>
                <Input
                  name="shortDescription"
                  placeholder="Optional"
                  className="mt-1 h-8"
                />
              </div>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "..." : "Add"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
