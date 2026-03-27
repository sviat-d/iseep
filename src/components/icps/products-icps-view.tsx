"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ProductSelector } from "@/components/icps/product-selector";
import { IcpProductContext } from "@/components/icps/icp-product-context";
import { CompanyBlock } from "@/components/icps/company-block";
import { IcpListView } from "@/components/icps/icp-list-view";
import { AddIcpDialog } from "@/components/icps/add-icp-dialog";
import { CompanyShareBanner } from "@/components/shared/company-share-dialog";
import { ContextExportButton } from "@/components/shared/context-export-button";
import { Plus, FileText, Link2, Target } from "lucide-react";
import type { GtmContextPackage } from "@/lib/context-export/types";

type CompanyData = {
  name: string;
  website: string | null;
  companyDescription: string | null;
  targetCustomers: string | null;
  industriesFocus: string[];
  geoFocus: string[];
};

type Product = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  coreUseCases: string[];
  keyValueProps: string[];
  pricingModel: string | null;
  avgTicket: string | null;
  useCases: Array<{ id: string; name: string }>;
};

type IcpItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  productId: string | null;
  productCount: number;
  linkedProductIds: string[];
  createdAt: Date;
  updatedAt: Date;
  qualifyCount: number;
  excludeCount: number;
  personaCount: number;
};

type WsShare = {
  profileShareToken: string | null;
  profileShareMode: string | null;
  profileSharedIcpIds: string[] | null;
};

export function ProductsIcpsView({
  company,
  products,
  allIcps,
  wsShare,
  exportContext,
  initialProductId,
}: {
  company: CompanyData;
  products: Product[];
  allIcps: IcpItem[];
  wsShare: WsShare;
  exportContext: GtmContextPackage;
  initialProductId: string | null;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    initialProductId ?? (products.length > 0 ? products[0].id : null)
  );
  const [showAddIcp, setShowAddIcp] = useState(false);
  const [showExistingIcps, setShowExistingIcps] = useState(false);

  const filteredIcps = useMemo(() => {
    if (!selectedProductId) return allIcps;
    return allIcps.filter((icp) =>
      icp.linkedProductIds?.includes(selectedProductId)
    );
  }, [allIcps, selectedProductId]);

  const unlinkedIcps = useMemo(() => {
    if (!selectedProductId) return [];
    return allIcps.filter((icp) =>
      !icp.linkedProductIds?.includes(selectedProductId)
    );
  }, [allIcps, selectedProductId]);

  const activeProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-4">
      {/* Company block + Copy full context */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <CompanyBlock company={company} />
        </div>
        <ContextExportButton context={exportContext} label="Copy full context" />
      </div>

      <ProductSelector
        products={products}
        selectedProductId={selectedProductId}
        onSelect={setSelectedProductId}
      />

      {activeProduct && (
        <IcpProductContext
          key={activeProduct.id}
          product={{
            id: activeProduct.id,
            name: activeProduct.name,
            shortDescription: activeProduct.shortDescription,
            contextDescription: activeProduct.description,
            coreUseCases: activeProduct.coreUseCases,
            keyValueProps: activeProduct.keyValueProps,
            pricingModel: activeProduct.pricingModel,
            avgTicket: activeProduct.avgTicket,
            useCases: activeProduct.useCases,
          }}
          onDeleted={() => {
            const remaining = products.filter((p) => p.id !== activeProduct.id);
            if (remaining.length > 0) setSelectedProductId(remaining[0].id);
            else setSelectedProductId(null);
          }}
        />
      )}

      <CompanyShareBanner
        profileShareToken={wsShare.profileShareToken}
        profileShareMode={wsShare.profileShareMode}
        profileSharedIcpIds={wsShare.profileSharedIcpIds}
        allIcps={filteredIcps.map((i) => ({ id: i.id, name: i.name, status: i.status }))}
      />

      {/* ICP header + actions — compact */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ICPs</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/icps/import"
            className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-colors"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Import
          </Link>
          {selectedProductId && (
            <button
              type="button"
              onClick={() => setShowAddIcp(true)}
              className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add ICP
            </button>
          )}
        </div>
      </div>

      {/* Add ICP dialog */}
      {showAddIcp && selectedProductId && activeProduct && (
        <AddIcpDialog
          productId={selectedProductId}
          productName={activeProduct.name}
          existingIcps={unlinkedIcps.map((i) => ({
            id: i.id,
            name: i.name,
            status: i.status,
            productCount: i.productCount,
          }))}
          onClose={() => setShowAddIcp(false)}
        />
      )}

      {/* "Use existing" direct list (from empty state) */}
      {showExistingIcps && selectedProductId && activeProduct && (
        <AddIcpDialog
          productId={selectedProductId}
          productName={activeProduct.name}
          existingIcps={unlinkedIcps.map((i) => ({
            id: i.id,
            name: i.name,
            status: i.status,
            productCount: i.productCount,
          }))}
          onClose={() => setShowExistingIcps(false)}
          skipChooseStep
        />
      )}

      {/* ICP List or empty state */}
      {filteredIcps.length > 0 ? (
        <IcpListView icps={filteredIcps} />
      ) : !showAddIcp && !showExistingIcps && (
        <div className="py-8 text-center">
          <Target className="mx-auto h-7 w-7 text-muted-foreground/30" />
          <p className="mt-2 text-sm font-medium">No ICPs yet for this product</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a new ICP or use an existing one from another product.
          </p>
          {selectedProductId && (
            <div className="mt-3 flex justify-center gap-2">
              <Link
                href={`/icps/new?product=${selectedProductId}`}
                className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create new ICP
              </Link>
              {unlinkedIcps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowExistingIcps(true)}
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  Use existing ICP
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
