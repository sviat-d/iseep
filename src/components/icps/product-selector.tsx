"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Package, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { createProduct, deleteProduct } from "@/actions/products";

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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistic products list for instant add
  const [optimisticProducts, addOptimistic] = useOptimistic(
    products,
    (state, newProduct: Product) => [...state, newProduct]
  );

  function handleCreate(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    const shortDescription = (formData.get("shortDescription") as string)?.trim() || null;
    if (!name) return;

    // Optimistic: add immediately with temp ID
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

  function handleDelete(productId: string) {
    startTransition(async () => {
      await deleteProduct(productId);
      setConfirmDeleteId(null);
      const remaining = optimisticProducts.filter((p) => p.id !== productId);
      if (remaining.length > 0) onSelect(remaining[0].id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {optimisticProducts.map((p) => {
          const isSelected = p.id === selectedProductId;

          return (
            <div key={p.id} className="relative flex items-center">
              <button
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

              {!p.id.startsWith("temp-") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === p.id ? null : p.id);
                  }}
                  className="ml-0.5 rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              )}

              {menuOpenId === p.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                  <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
                    <Link
                      href={`/icps/products/${p.id}`}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setMenuOpenId(null)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setConfirmDeleteId(p.id);
                        setMenuOpenId(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
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

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <Card className="border-destructive/30">
          <CardContent className="py-3">
            <p className="text-sm">
              Delete <span className="font-medium">{optimisticProducts.find((p) => p.id === confirmDeleteId)?.name}</span> and all its ICPs and cases?
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" disabled={isPending} onClick={() => handleDelete(confirmDeleteId)}>
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add product form */}
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
