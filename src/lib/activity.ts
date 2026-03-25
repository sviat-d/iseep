import { db } from "@/db";
import { activityEvents } from "@/db/schema";

/**
 * Log an activity event. Fire-and-forget — never throws.
 */
export async function logActivity(
  workspaceId: string,
  userId: string | null,
  event: {
    eventType: string;
    entityType?: string;
    entityId?: string;
    summary: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.insert(activityEvents).values({
      workspaceId,
      userId,
      eventType: event.eventType,
      entityType: event.entityType ?? null,
      entityId: event.entityId ?? null,
      summary: event.summary,
      metadata: event.metadata ?? {},
    });
  } catch {
    // Activity logging should never block the main action
    console.error("[activity] Failed to log event:", event.eventType);
  }
}
