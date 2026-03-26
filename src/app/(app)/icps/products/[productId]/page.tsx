import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ProductEditForm } from "@/components/icps/product-edit-form";

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.workspaceId, ctx.workspaceId)));

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-muted-foreground">{product.name}</p>
      </div>
      <ProductEditForm product={product} />
    </div>
  );
}
