import { authenticateApiRequest } from "@/lib/api-auth";
import { buildFullContext } from "@/lib/context-export/builders";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const modulesParam = url.searchParams.get("modules");

  const modules: Record<string, boolean> = {};
  if (modulesParam) {
    const requested = modulesParam.split(",").map(m => m.trim());
    modules.product = requested.includes("product");
    modules.icps = requested.includes("icps");
    modules.scoring = requested.includes("scoring");
  }

  const context = await buildFullContext(auth.workspaceId, modules);
  return Response.json(context);
}
