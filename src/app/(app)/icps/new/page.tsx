import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getIcpsForSelect } from "@/lib/queries/icps";
import { getProducts } from "@/actions/products";
import { createIcp } from "@/actions/icps";
import { IcpForm } from "@/components/icps/icp-form";

export default async function NewIcpPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const { product: productId } = await searchParams;
  const [existingIcps, allProducts] = await Promise.all([
    getIcpsForSelect(ctx.workspaceId),
    getProducts(ctx.workspaceId),
  ]);

  // Default to first product if none specified
  const activeProductId = productId ?? (allProducts.length > 0 ? allProducts[0].id : null);
  const activeProduct = allProducts.find((p) => p.id === activeProductId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create ICP</h1>
        {activeProduct && (
          <p className="text-muted-foreground">
            New ICP for {activeProduct.name}
          </p>
        )}
      </div>
      <IcpForm
        action={createIcp}
        existingIcps={existingIcps}
        productId={activeProductId}
      />
    </div>
  );
}
