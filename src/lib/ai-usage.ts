import { db } from "@/db";
import { aiUsage } from "@/db/schema";
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

export async function checkAiLimit(workspaceId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const usage = await getMonthlyUsage(workspaceId);
  return { allowed: usage.used < usage.limit, ...usage };
}
