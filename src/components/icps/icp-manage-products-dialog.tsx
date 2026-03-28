"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateIcpProducts } from "@/actions/product-icps";
import { Settings2, Check, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Product = { id: string; name: string };

type ProductUsage = {
  hypothesesCount: number;
  casesCount: number;
};

type IcpManageProductsDialogProps = {
  icpId: string;
  allProducts: Product[];
  attachedProductIds: string[];
  productUsage?: Record<string, ProductUsage>;
};

export function IcpManageProductsDialog({
  icpId,
  allProducts,
  attachedProductIds,
  productUsage = {},
}: IcpManageProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(attachedProductIds),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpen() {
    setSelected(new Set(attachedProductIds));
    setError(null);
    setOpen(true);
  }

  function toggleProduct(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        if (next.size <= 1) return prev;
        // Block if product is used by hypotheses or cases
        const usage = productUsage[productId];
        if (usage && (usage.hypothesesCount > 0 || usage.casesCount > 0)) {
          return prev;
        }
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
    setError(null);
  }

  function handleSave() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setError("An ICP must remain attached to at least one product.");
      return;
    }

    startTransition(async () => {
      const result = await updateIcpProducts(icpId, ids);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  const hasChanges =
    selected.size !== attachedProductIds.length ||
    attachedProductIds.some((id) => !selected.has(id));

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors inline-flex items-center gap-1"
      >
        <Settings2 className="h-3 w-3" />
        Manage
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage products</DialogTitle>
            <DialogDescription>
              Choose which products this ICP is attached to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {allProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products available yet.
              </p>
            ) : (
              <div className="space-y-1">
                {allProducts.map((product) => {
                  const isSelected = selected.has(product.id);
                  const isLastSelected = isSelected && selected.size === 1;
                  const usage = productUsage[product.id];
                  const isBlocked = isSelected && usage && (usage.hypothesesCount > 0 || usage.casesCount > 0);
                  const isDisabled = isLastSelected || isBlocked;

                  return (
                    <div key={product.id}>
                      <button
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        disabled={!!isDisabled}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        } ${isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="font-medium">{product.name}</span>
                        {isLastSelected && (
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            At least one required
                          </span>
                        )}
                      </button>
                      {isBlocked && (
                        <div className="ml-7 mt-1 mb-1 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Cannot remove — still used by:
                          </div>
                          <div className="text-amber-600 dark:text-amber-400/80 space-y-0.5">
                            {usage.hypothesesCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span>{usage.hypothesesCount} hypothesis{usage.hypothesesCount > 1 ? "es" : ""}</span>
                                <Link
                                  href={`/icps/${icpId}?product=${product.id}#hypotheses`}
                                  onClick={() => setOpen(false)}
                                  className="underline hover:text-amber-800 dark:hover:text-amber-300"
                                >
                                  View
                                </Link>
                              </div>
                            )}
                            {usage.casesCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span>{usage.casesCount} case{usage.casesCount > 1 ? "s" : ""}</span>
                                <Link
                                  href={`/icps/${icpId}?product=${product.id}#cases`}
                                  onClick={() => setOpen(false)}
                                  className="underline hover:text-amber-800 dark:hover:text-amber-300"
                                >
                                  View
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              This attaches the same ICP to multiple products. It does not
              create duplicates.
            </p>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || !hasChanges}
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
