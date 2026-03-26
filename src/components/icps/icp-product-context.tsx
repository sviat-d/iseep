"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Package, Pencil } from "lucide-react";

type ProductData = {
  id: string;
  name: string;
  shortDescription: string | null;
  contextDescription: string | null;
  coreUseCases: string[];
  keyValueProps: string[];
};

export function IcpProductContext({ product }: { product: ProductData | null }) {
  const [open, setOpen] = useState(false);

  if (!product) return null;

  const hasContext = product.contextDescription || product.coreUseCases.length > 0 || product.keyValueProps.length > 0;
  const isEmpty = !hasContext && !product.shortDescription;

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

      {open && (
        <div className="border-t px-4 py-3 space-y-2.5">
          {hasContext ? (
            <>
              {product.contextDescription && (
                <p className="text-sm text-muted-foreground">{product.contextDescription}</p>
              )}
              <div className="flex flex-wrap gap-3">
                {product.coreUseCases.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Use cases</p>
                    <div className="flex flex-wrap gap-1">
                      {product.coreUseCases.map((uc) => (
                        <Badge key={uc} variant="secondary" className="text-[10px]">{uc}</Badge>
                      ))}
                    </div>
                  </div>
                )}
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
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No details yet. Add description, use cases, and value props to help iseep generate better ICPs.
            </p>
          )}
          <div className="flex justify-end">
            <Link
              href={`/icps/products/${product.id}`}
              className="inline-flex items-center h-7 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit product
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
