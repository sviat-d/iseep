import { db } from "@/db";
import { productContext } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getProductContext(workspaceId: string) {
  const [ctx] = await db
    .select()
    .from(productContext)
    .where(eq(productContext.workspaceId, workspaceId));
  return ctx ?? null;
}

export async function getProductContextForProduct(productId: string) {
  const [ctx] = await db
    .select()
    .from(productContext)
    .where(eq(productContext.productId, productId));
  return ctx ?? null;
}
