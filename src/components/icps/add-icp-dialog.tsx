"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, Copy, X, Check } from "lucide-react";
import { linkIcpToProduct, duplicateIcpForProduct } from "@/actions/product-icps";

type ExistingIcp = {
  id: string;
  name: string;
  status: string;
  productCount: number;
};

export function AddIcpDialog({
  productId,
  productName,
  existingIcps,
  onClose,
  skipChooseStep = false,
}: {
  productId: string;
  productName: string;
  existingIcps: ExistingIcp[];
  onClose: () => void;
  skipChooseStep?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "select">(skipChooseStep ? "select" : "choose");
  const [selectedIcpId, setSelectedIcpId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ICPs not yet linked to this product
  const availableIcps = existingIcps;

  function handleLink(icpId: string) {
    startTransition(async () => {
      await linkIcpToProduct(icpId, productId);
      onClose();
      router.refresh();
    });
  }

  function handleDuplicate(icpId: string) {
    startTransition(async () => {
      await duplicateIcpForProduct(icpId, productId);
      onClose();
      router.refresh();
    });
  }

  if (step === "choose") {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Add ICP to {productName}</p>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/icps/new?product=${productId}`);
              }}
              className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted transition-colors"
            >
              <Plus className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Create new ICP</p>
                <p className="text-xs text-muted-foreground">Define a new ICP for this product</p>
              </div>
            </button>
            {availableIcps.length > 0 && (
              <button
                type="button"
                onClick={() => setStep("select")}
                className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted transition-colors"
              >
                <Link2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Use existing ICP</p>
                  <p className="text-xs text-muted-foreground">Share an ICP from another product</p>
                </div>
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step: select existing ICP
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">Use existing ICP in {productName}</p>
            <p className="text-xs text-muted-foreground">Select an ICP to share or duplicate</p>
          </div>
          <button type="button" onClick={() => setStep("choose")} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {availableIcps.map((icp) => (
            <div
              key={icp.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                selectedIcpId === icp.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedIcpId(selectedIcpId === icp.id ? null : icp.id)}
                className="flex-1 text-left flex items-center gap-2"
              >
                <span className="text-sm font-medium">{icp.name}</span>
                <Badge variant="outline" className="text-[10px]">{icp.status}</Badge>
                {icp.productCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    Used in {icp.productCount} {icp.productCount === 1 ? "product" : "products"}
                  </span>
                )}
              </button>
              {selectedIcpId === icp.id && (
                <div className="flex gap-1.5 ml-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={isPending}
                    onClick={() => handleLink(icp.id)}
                  >
                    <Link2 className="mr-1 h-3 w-3" />
                    Use shared
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={isPending}
                    onClick={() => handleDuplicate(icp.id)}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Duplicate
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        {availableIcps.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No other ICPs available</p>
        )}
      </CardContent>
    </Card>
  );
}
