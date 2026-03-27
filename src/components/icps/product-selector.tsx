"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onSelect,
}: {
  products: Product[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticProducts, addOptimistic] = useOptimistic(
    products,
    (state, newProduct: Product) => [...state, newProduct]
  );

  function handleCreate(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    const shortDescription = (formData.get("shortDescription") as string)?.trim() || null;
    if (!name) return;

    const tempId = `temp-${Date.now()}`;
    addOptimistic({ id: tempId, name, shortDescription });
    onSelect(tempId);
    setShowAdd(false);

    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.success && result.productId) {
        onSelect(result.productId);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {optimisticProducts.map((p) => {
          const isSelected = p.id === selectedProductId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
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
                <Input name="name" placeholder="e.g., Mass Payouts" required className="mt-1 h-8" autoFocus />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input name="shortDescription" placeholder="Optional" className="mt-1 h-8" />
              </div>
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "..." : "Add"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="h-3.5 w-3.5" /></Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
