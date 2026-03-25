import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function authenticateApiRequest(
  request: Request,
): Promise<{ workspaceId: string } | Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.apiToken, token))
    .limit(1);

  if (!workspace) {
    return Response.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  return { workspaceId: workspace.id };
}
