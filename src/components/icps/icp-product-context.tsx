"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Pencil, Package } from "lucide-react";

type ProductContextData = {
  companyName: string | null;
  productDescription: string;
  coreUseCases: string[];
  keyValueProps: string[];
  industriesFocus: string[];
  geoFocus: string[];
} | null;

export function IcpProductContext({ product }: { product: ProductContextData }) {
  const [open, setOpen] = useState(false);

  if (!product) {
    return (
      <div className="rounded-lg border border-dashed p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            No product context set
          </div>
          <Link
            href="/settings/product"
            className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium border border-border bg-background hover:bg-muted transition-colors"
          >
            Add context
          </Link>
        </div>
      </div>
    );
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
        <span className="text-sm font-medium">Product Context</span>
        {product.companyName && (
          <span className="text-xs text-muted-foreground">
            — {product.companyName}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-2.5">
          <p className="text-sm text-muted-foreground">
            {product.productDescription}
          </p>

          <div className="flex flex-wrap gap-3">
            {product.coreUseCases.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                  Use cases
                </p>
                <div className="flex flex-wrap gap-1">
                  {product.coreUseCases.map((uc) => (
                    <Badge key={uc} variant="secondary" className="text-[10px]">
                      {uc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {product.industriesFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                  Industries
                </p>
                <div className="flex flex-wrap gap-1">
                  {product.industriesFocus.map((ind) => (
                    <Badge key={ind} variant="outline" className="text-[10px]">
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {product.geoFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                  Regions
                </p>
                <div className="flex flex-wrap gap-1">
                  {product.geoFocus.map((geo) => (
                    <Badge key={geo} variant="outline" className="text-[10px]">
                      {geo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              href="/settings/product"
              className="inline-flex items-center h-7 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
