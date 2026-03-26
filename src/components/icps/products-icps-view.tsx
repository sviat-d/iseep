"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ProductSelector } from "@/components/icps/product-selector";
import { IcpProductContext } from "@/components/icps/icp-product-context";
import { CompanyBlock } from "@/components/icps/company-block";
import { IcpListView } from "@/components/icps/icp-list-view";
import { CompanyShareBanner } from "@/components/shared/company-share-dialog";
import { ContextExportButton } from "@/components/shared/context-export-button";
import { Plus, FileText } from "lucide-react";
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
};

type IcpItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  productId: string | null;
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

  const filteredIcps = useMemo(() => {
    if (!selectedProductId) return allIcps;
    return allIcps.filter((icp) => icp.productId === selectedProductId);
  }, [allIcps, selectedProductId]);

  const activeProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Company block — clickable, inline editable */}
      <CompanyBlock company={company} />

      {/* Product Selector */}
      <ProductSelector
        products={products}
        selectedProductId={selectedProductId}
        onSelect={setSelectedProductId}
      />

      {/* Product Context for selected product */}
      {activeProduct && (
        <IcpProductContext
          product={{
            name: activeProduct.name,
            shortDescription: activeProduct.shortDescription,
            contextDescription: activeProduct.description,
            coreUseCases: activeProduct.coreUseCases,
            keyValueProps: activeProduct.keyValueProps,
          }}
        />
      )}

      {/* Company Profile Sharing */}
      <CompanyShareBanner
        profileShareToken={wsShare.profileShareToken}
        profileShareMode={wsShare.profileShareMode}
        profileSharedIcpIds={wsShare.profileSharedIcpIds}
        allIcps={filteredIcps.map((i) => ({ id: i.id, name: i.name, status: i.status }))}
      />

      {/* ICP header + actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ICPs</h1>
          {activeProduct && (
            <p className="text-muted-foreground">
              {activeProduct.shortDescription || `Ideal Customer Profiles for ${activeProduct.name}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ContextExportButton context={exportContext} label="Copy all ICPs" />
          <Link
            href="/icps/import"
            className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-colors"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Import
          </Link>
          <Link
            href={`/icps/new${selectedProductId ? `?product=${selectedProductId}` : ""}`}
            className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create ICP
          </Link>
        </div>
      </div>

      <IcpListView icps={filteredIcps} />
    </div>
  );
}
