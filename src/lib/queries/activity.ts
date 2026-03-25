import { db } from "@/db";
import { activityEvents, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getRecentActivity(workspaceId: string, limit = 10) {
  return db
    .select({
      id: activityEvents.id,
      eventType: activityEvents.eventType,
      entityType: activityEvents.entityType,
      entityId: activityEvents.entityId,
      summary: activityEvents.summary,
      metadata: activityEvents.metadata,
      createdAt: activityEvents.createdAt,
      userId: activityEvents.userId,
      userName: users.fullName,
    })
    .from(activityEvents)
    .leftJoin(users, eq(activityEvents.userId, users.id))
    .where(eq(activityEvents.workspaceId, workspaceId))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit);
}
