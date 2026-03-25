import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, drafts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseDraftsInput } from "@/lib/drafts/parse";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.apiToken, token));

  if (!ws) {
    return NextResponse.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  let body: string;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const result = parseDraftsInput(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: 400 },
    );
  }

  const ids: string[] = [];
  for (const d of result.drafts) {
    const [row] = await db
      .insert(drafts)
      .values({
        workspaceId: ws.id,
        source: "claude",
        targetType: d.targetType,
        targetId: d.targetId,
        payload: d.payload,
        summary: d.summary,
        reasoning: d.reasoning,
      })
      .returning({ id: drafts.id });
    ids.push(row.id);
  }

  return NextResponse.json(
    { created: ids.length, ids },
    { status: 201 },
  );
}
