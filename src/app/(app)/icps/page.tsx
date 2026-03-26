import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcps } from "@/lib/queries/icps";
import { getProductContextForProduct } from "@/lib/queries/product-context";
import { getWorkspaceShareInfo } from "@/lib/queries/workspace";
import { getProducts } from "@/actions/products";
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
  const [allProducts, allIcps, wsShare, exportContext] = await Promise.all([
    getProducts(ctx.workspaceId),
    getIcps(ctx.workspaceId), // ALL ICPs, filtering happens client-side
    getWorkspaceShareInfo(ctx.workspaceId),
    buildFullContext(ctx.workspaceId, { product: true, icps: true, scoring: false }),
  ]);

  // Get workspace name for company display
  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));
  const companyName = ws?.name ?? "Company";

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

  // Build product data with context for each product
  const productsWithContext = await Promise.all(
    allProducts.map(async (p) => {
      const pCtx = await getProductContextForProduct(p.id);
      return {
        id: p.id,
        name: p.name,
        shortDescription: p.shortDescription,
        contextDescription: pCtx?.productDescription ?? null,
        coreUseCases: (pCtx?.coreUseCases as string[]) ?? [],
        industriesFocus: (pCtx?.industriesFocus as string[]) ?? [],
        geoFocus: (pCtx?.geoFocus as string[]) ?? [],
      };
    })
  );

  const initialProductId =
    selectedProductId && allProducts.some((p) => p.id === selectedProductId)
      ? selectedProductId
      : allProducts[0]?.id ?? null;

  return (
    <ProductsIcpsView
      companyName={companyName}
      products={productsWithContext}
      allIcps={allIcps}
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
