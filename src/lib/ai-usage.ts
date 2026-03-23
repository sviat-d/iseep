import { db } from "@/db";
import { aiUsage, aiKeys } from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

const MONTHLY_LIMIT = 20;

export async function getMonthlyUsage(workspaceId: string): Promise<{ used: number; limit: number }> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(and(
      eq(aiUsage.workspaceId, workspaceId),
      gte(aiUsage.createdAt, startOfMonth)
    ));

  return { used: result?.count ?? 0, limit: MONTHLY_LIMIT };
}

export async function trackAiUsage(
  workspaceId: string,
  userId: string,
  operation: string,
  tokensUsed?: number
) {
  await db.insert(aiUsage).values({
    workspaceId,
    userId,
    operation,
    tokensUsed: tokensUsed ?? null,
  });
}

export async function checkAiLimit(workspaceId: string): Promise<{ allowed: boolean; used: number; limit: number; hasOwnKey: boolean }> {
  // Check if user has own key
  const [userKey] = await db
    .select()
    .from(aiKeys)
    .where(and(eq(aiKeys.workspaceId, workspaceId), eq(aiKeys.isActive, true)));

  if (userKey) {
    // Own key = unlimited
    const usage = await getMonthlyUsage(workspaceId);
    return { allowed: true, used: usage.used, limit: Infinity, hasOwnKey: true };
  }

  const usage = await getMonthlyUsage(workspaceId);
  return { allowed: usage.used < usage.limit, ...usage, hasOwnKey: false };
}
