import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drafts } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { parseDraftsInput } from "@/lib/drafts/parse";

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;

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
        workspaceId: auth.workspaceId,
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
