// src/app/(app)/drafts/page.tsx
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { drafts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { DraftsInbox } from "@/components/drafts/drafts-inbox";

export default async function DraftsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const allDrafts = await db
    .select({
      id: drafts.id,
      source: drafts.source,
      targetType: drafts.targetType,
      summary: drafts.summary,
      status: drafts.status,
      createdAt: drafts.createdAt,
    })
    .from(drafts)
    .where(eq(drafts.workspaceId, ctx.workspaceId))
    .orderBy(sql`${drafts.createdAt} desc`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suggestions</h1>
        <p className="text-muted-foreground">
          Review changes proposed by Claude or your team
        </p>
      </div>
      <DraftsInbox drafts={allDrafts} />
    </div>
  );
}
