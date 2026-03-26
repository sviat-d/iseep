"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Package } from "lucide-react";

type ProductData = {
  name: string;
  shortDescription: string | null;
  contextDescription: string | null;
  coreUseCases: string[];
  industriesFocus: string[];
  geoFocus: string[];
};

export function IcpProductContext({ product }: { product: ProductData | null }) {
  const [open, setOpen] = useState(false);

  if (!product) return null;

  const hasContext = product.contextDescription || product.coreUseCases.length > 0 || product.industriesFocus.length > 0 || product.geoFocus.length > 0;

  if (!hasContext && !product.shortDescription) return null;

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
          <span className="text-xs text-muted-foreground">
            — {product.shortDescription}
          </span>
        )}
      </button>

      {open && hasContext && (
        <div className="border-t px-4 py-3 space-y-2.5">
          {product.contextDescription && (
            <p className="text-sm text-muted-foreground">
              {product.contextDescription}
            </p>
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
            {product.industriesFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Industries</p>
                <div className="flex flex-wrap gap-1">
                  {product.industriesFocus.map((ind) => (
                    <Badge key={ind} variant="outline" className="text-[10px]">{ind}</Badge>
                  ))}
                </div>
              </div>
            )}
            {product.geoFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Regions</p>
                <div className="flex flex-wrap gap-1">
                  {product.geoFocus.map((geo) => (
                    <Badge key={geo} variant="outline" className="text-[10px]">{geo}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
