import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { scoredUploads, scoredLeads, icps } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const uploadId = url.searchParams.get("uploadId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);

  // Find upload
  let upload;
  if (uploadId) {
    [upload] = await db
      .select()
      .from(scoredUploads)
      .where(
        and(
          eq(scoredUploads.id, uploadId),
          eq(scoredUploads.workspaceId, auth.workspaceId),
        ),
      )
      .limit(1);
  } else {
    [upload] = await db
      .select()
      .from(scoredUploads)
      .where(eq(scoredUploads.workspaceId, auth.workspaceId))
      .orderBy(desc(scoredUploads.createdAt))
      .limit(1);
  }

  if (!upload) {
    return Response.json({ error: "No scoring runs found" }, { status: 404 });
  }

  // Get leads
  const leads = await db
    .select({
      companyName: sql<string>`${scoredLeads.rawData}->>'company_name'`,
      industry: scoredLeads.industry,
      fitLevel: scoredLeads.fitLevel,
      fitScore: scoredLeads.fitScore,
      bestIcpId: scoredLeads.bestIcpId,
    })
    .from(scoredLeads)
    .where(eq(scoredLeads.uploadId, upload.id))
    .orderBy(desc(scoredLeads.fitScore))
    .limit(limit);

  // Get ICP names for the leads
  const icpIds = [...new Set(leads.map(l => l.bestIcpId).filter(Boolean))] as string[];
  const icpNames: Record<string, string> = {};
  if (icpIds.length > 0) {
    const icpRows = await db
      .select({ id: icps.id, name: icps.name })
      .from(icps)
      .where(sql`${icps.id} IN (${sql.join(icpIds.map(id => sql`${id}`), sql`, `)})`);
    for (const row of icpRows) {
      icpNames[row.id] = row.name;
    }
  }

  // Compute stats
  let highFit = 0, borderline = 0, blocked = 0, unmatched = 0;
  // Need full count — query all leads for stats (not just limited)
  const allLeads = await db
    .select({ fitLevel: scoredLeads.fitLevel })
    .from(scoredLeads)
    .where(eq(scoredLeads.uploadId, upload.id));

  for (const l of allLeads) {
    switch (l.fitLevel) {
      case "high": highFit++; break;
      case "medium": case "low": case "risk": borderline++; break;
      case "blocked": blocked++; break;
      default: unmatched++;
    }
  }

  return Response.json({
    upload: {
      id: upload.id,
      fileName: upload.fileName,
      totalRows: upload.totalRows,
      createdAt: upload.createdAt,
    },
    stats: { highFit, borderline, blocked, unmatched },
    leads: leads.map(l => ({
      companyName: l.companyName ?? "Unknown",
      industry: l.industry ?? "Unknown",
      fitLevel: l.fitLevel ?? "none",
      fitScore: l.fitScore ?? 0,
      bestIcpName: l.bestIcpId ? (icpNames[l.bestIcpId] ?? null) : null,
    })),
  });
}
