import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getIcps } from "@/lib/queries/icps";
import { getProductContextForProduct } from "@/lib/queries/product-context";
import { getWorkspaceShareInfo } from "@/lib/queries/workspace";
import { getProducts } from "@/actions/products";
import { IcpListView } from "@/components/icps/icp-list-view";
import { IcpProductContext } from "@/components/icps/icp-product-context";
import { ProductSelector } from "@/components/icps/product-selector";
import { CompanyShareBanner } from "@/components/shared/company-share-dialog";
import { Plus, FileText } from "lucide-react";
import { buildFullContext } from "@/lib/context-export/builders";
import { ContextExportButton } from "@/components/shared/context-export-button";

export default async function IcpsPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const { product: selectedProductId } = await searchParams;
  const allProducts = await getProducts(ctx.workspaceId);

  // Determine active product: from URL, or first product, or null
  const activeProductId =
    selectedProductId && allProducts.some((p) => p.id === selectedProductId)
      ? selectedProductId
      : allProducts.length > 0
        ? allProducts[0].id
        : null;

  const [icps, wsShare, exportContext] = await Promise.all([
    getIcps(ctx.workspaceId, activeProductId ?? undefined),
    getWorkspaceShareInfo(ctx.workspaceId),
    buildFullContext(ctx.workspaceId, { product: true, icps: true, scoring: false }),
  ]);

  // Get product context for active product
  const productCtx = activeProductId
    ? await getProductContextForProduct(activeProductId)
    : null;

  const productData = productCtx
    ? {
        companyName: productCtx.companyName,
        productDescription: productCtx.productDescription,
        coreUseCases: (productCtx.coreUseCases as string[]) ?? [],
        keyValueProps: (productCtx.keyValueProps as string[]) ?? [],
        industriesFocus: (productCtx.industriesFocus as string[]) ?? [],
        geoFocus: (productCtx.geoFocus as string[]) ?? [],
      }
    : null;

  const activeProduct = allProducts.find((p) => p.id === activeProductId);

  // Empty state: no products at all
  if (allProducts.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Products & ICPs</h1>
          <p className="text-muted-foreground">
            Products help you organize ICPs by solution or offering. Start by adding your first product.
          </p>
          <ProductSelector products={[]} selectedProductId={null} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <ProductSelector
        products={allProducts.map((p) => ({ id: p.id, name: p.name, shortDescription: p.shortDescription }))}
        selectedProductId={activeProductId}
      />

      {/* Product Context for selected product */}
      <IcpProductContext product={productData} />

      {/* Company Profile Sharing */}
      <CompanyShareBanner
        profileShareToken={wsShare?.profileShareToken ?? null}
        profileShareMode={wsShare?.profileShareMode ?? null}
        profileSharedIcpIds={
          (wsShare?.profileSharedIcpIds as string[] | null) ?? null
        }
        allIcps={icps.map((i) => ({
          id: i.id,
          name: i.name,
          status: i.status,
        }))}
      />

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
            href={`/icps/new${activeProductId ? `?product=${activeProductId}` : ""}`}
            className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create ICP
          </Link>
        </div>
      </div>
      <IcpListView icps={icps} />
    </div>
  );
}
