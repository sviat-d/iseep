import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcps } from "@/lib/queries/icps";
import { getWorkspaceShareInfo } from "@/lib/queries/workspace";
import { productIcps } from "@/db/schema";
import { getProducts } from "@/actions/products";
import { getUseCasesForProduct } from "@/actions/use-cases";
import { ProductsIcpsView } from "@/components/icps/products-icps-view";
import { ProductSelector } from "@/components/icps/product-selector";
import { buildFullContext } from "@/lib/context-export/builders";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function IcpsPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const { product: selectedProductId } = await searchParams;
  const [allProducts, allIcps, wsShare, exportContext, [ws], allLinks] = await Promise.all([
    getProducts(ctx.workspaceId),
    getIcps(ctx.workspaceId),
    getWorkspaceShareInfo(ctx.workspaceId),
    buildFullContext(ctx.workspaceId, { product: true, icps: true, scoring: false }),
    db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)),
    db.select({ productId: productIcps.productId, icpId: productIcps.icpId })
      .from(productIcps)
      .where(eq(productIcps.workspaceId, ctx.workspaceId)),
  ]);

  // Build reliable linkedProductIds map from product_icps table
  const linkMap = new Map<string, string[]>();
  for (const link of allLinks) {
    const existing = linkMap.get(link.icpId) ?? [];
    existing.push(link.productId);
    linkMap.set(link.icpId, existing);
  }

  // Enrich ICPs with reliable linkedProductIds
  const enrichedIcps = allIcps.map((icp) => ({
    ...icp,
    linkedProductIds: linkMap.get(icp.id) ?? [],
  }));

  const company = {
    name: ws?.name ?? "Company",
    website: ws?.website ?? null,
    companyDescription: ws?.companyDescription ?? null,
    targetCustomers: ws?.targetCustomers ?? null,
    industriesFocus: (ws?.industriesFocus as string[]) ?? [],
    geoFocus: (ws?.geoFocus as string[]) ?? [],
  };

  // Empty state: no products
  if (allProducts.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Products & ICPs</h1>
          <p className="text-muted-foreground">
            Products help you organize ICPs by solution or offering. Start by adding your first product.
          </p>
          <ProductSelector products={[]} selectedProductId={null} onSelect={() => {}} />
        </div>
      </div>
    );
  }

  // Fetch use cases for all products in parallel
  const allUseCases = await Promise.all(
    allProducts.map((p) => getUseCasesForProduct(p.id, ctx.workspaceId))
  );

  const productsData = allProducts.map((p, i) => ({
    id: p.id,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    coreUseCases: (p.coreUseCases as string[]) ?? [],
    keyValueProps: (p.keyValueProps as string[]) ?? [],
    pricingModel: p.pricingModel,
    avgTicket: p.avgTicket,
    useCases: allUseCases[i].map((uc) => ({ id: uc.id, name: uc.name })),
  }));

  const initialProductId =
    selectedProductId && allProducts.some((p) => p.id === selectedProductId)
      ? selectedProductId
      : allProducts[0]?.id ?? null;

  return (
    <ProductsIcpsView
      company={company}
      products={productsData}
      allIcps={enrichedIcps}
      wsShare={{
        profileShareToken: wsShare?.profileShareToken ?? null,
        profileShareMode: wsShare?.profileShareMode ?? null,
        profileSharedIcpIds: (wsShare?.profileSharedIcpIds as string[] | null) ?? null,
      }}
      exportContext={exportContext}
      initialProductId={initialProductId}
    />
  );
}
