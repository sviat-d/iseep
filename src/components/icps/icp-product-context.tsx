"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight, Package, Pencil, Trash2, X, Plus } from "lucide-react";
import { updateProductFull, deleteProduct } from "@/actions/products";
import { createUseCase, deleteUseCase } from "@/actions/use-cases";

type ProductData = {
  id: string;
  name: string;
  shortDescription: string | null;
  contextDescription: string | null;
  coreUseCases: string[];
  keyValueProps: string[];
  pricingModel?: string | null;
  avgTicket?: string | null;
  useCases?: Array<{ id: string; name: string }>;
};

export function IcpProductContext({
  product,
  onDeleted,
}: {
  product: ProductData | null;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newUcName, setNewUcName] = useState("");
  const [localUseCases, setLocalUseCases] = useState(product?.useCases ?? []);

  if (!product) return null;

  const hasContext = product.contextDescription || product.keyValueProps.length > 0 || (product.useCases && product.useCases.length > 0);
  const isEmpty = !hasContext && !product.shortDescription;

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateProductFull(product!.id, formData);
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteProduct(product!.id);
      setConfirmDelete(false);
      onDeleted?.();
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{product.name}</span>
        {product.shortDescription && (
          <span className="text-xs text-muted-foreground">— {product.shortDescription}</span>
        )}
        {isEmpty && (
          <span className="ml-auto text-[10px] text-muted-foreground/50">No product details yet</span>
        )}
      </button>

      {/* View mode */}
      {open && !editing && !confirmDelete && (
        <div className="border-t px-4 py-3 space-y-2.5">
          {hasContext ? (
            <>
              {product.contextDescription && (
                <p className="text-sm text-muted-foreground">{product.contextDescription}</p>
              )}
              <div className="flex flex-wrap gap-3">
                {product.keyValueProps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Value props</p>
                    <div className="flex flex-wrap gap-1">
                      {product.keyValueProps.map((vp) => (
                        <Badge key={vp} variant="outline" className="text-[10px]">{vp}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {product.useCases && product.useCases.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Use cases</p>
                    <div className="flex flex-wrap gap-1">
                      {product.useCases.map((uc) => (
                        <Badge key={uc.id} variant="secondary" className="text-[10px]">{uc.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No details yet. Add description, use cases, and value props.
            </p>
          )}
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center h-7 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center h-7 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {open && confirmDelete && (
        <div className="border-t px-4 py-3">
          <p className="text-sm">
            Delete <span className="font-medium">{product.name}</span> and all its ICPs and cases?
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
              {isPending ? "Deleting..." : "Delete product"}
            </Button>
          </div>
        </div>
      )}

      {/* Inline edit form */}
      {open && editing && (
        <div className="border-t px-4 py-3">
          <form action={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Product name *</label>
                <Input name="name" defaultValue={product.name} required className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Short description</label>
                <Input name="shortDescription" defaultValue={product.shortDescription ?? ""} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea name="description" defaultValue={product.contextDescription ?? ""} rows={2} placeholder="What does this product do?" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Use cases</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {localUseCases.map((uc) => (
                  <span key={uc.id} className="inline-flex items-center gap-1 rounded-full border bg-secondary/50 px-2.5 py-1 text-xs font-medium">
                    {uc.name}
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteUseCase(uc.id);
                          if (result.success) {
                            setLocalUseCases((prev) => prev.filter((u) => u.id !== uc.id));
                          }
                        });
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <Input
                  value={newUcName}
                  onChange={(e) => setNewUcName(e.target.value)}
                  placeholder="Add use case..."
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newUcName.trim()) {
                      e.preventDefault();
                      const name = newUcName.trim();
                      startTransition(async () => {
                        const result = await createUseCase(product!.id, name);
                        if (result.success && result.useCaseId) {
                          setLocalUseCases((prev) => {
                            if (prev.some((u) => u.id === result.useCaseId)) return prev;
                            return [...prev, { id: result.useCaseId!, name }];
                          });
                          setNewUcName("");
                        }
                      });
                    }
                  }}
                />
                {newUcName.trim() && (
                  <button
                    type="button"
                    className="rounded border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted whitespace-nowrap"
                    onClick={() => {
                      const name = newUcName.trim();
                      startTransition(async () => {
                        const result = await createUseCase(product!.id, name);
                        if (result.success && result.useCaseId) {
                          setLocalUseCases((prev) => [...prev, { id: result.useCaseId!, name }]);
                          setNewUcName("");
                        }
                      });
                    }}
                  >
                    <Plus className="mr-0.5 inline h-3 w-3" />Add
                  </button>
                )}
              </div>
              <input type="hidden" name="coreUseCases" value={localUseCases.map((uc) => uc.name).join(", ")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Value propositions (comma-separated)</label>
              <Input name="keyValueProps" defaultValue={product.keyValueProps.join(", ")} placeholder="Low fees, Fast settlement, ..." className="mt-1" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pricing model</label>
                <Input name="pricingModel" defaultValue={product.pricingModel ?? ""} placeholder="Per transaction" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Avg ticket</label>
                <Input name="avgTicket" defaultValue={product.avgTicket ?? ""} placeholder="$5,000/mo" className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
