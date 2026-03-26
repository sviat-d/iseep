import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { db } from "@/db";
import { aiKeys, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMonthlyUsage } from "@/lib/ai-usage";

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

export default async function AiSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [existingKey] = await db
    .select()
    .from(aiKeys)
    .where(eq(aiKeys.workspaceId, ctx.workspaceId));

  const usage = await getMonthlyUsage(ctx.workspaceId);

  const [ws] = await db
    .select({ apiToken: workspaces.apiToken })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId));

  // Never send raw API key to client — mask it
  const safeKey = existingKey
    ? {
        id: existingKey.id,
        provider: existingKey.provider,
        maskedKey: maskKey(existingKey.apiKey),
        model: existingKey.model,
        isActive: existingKey.isActive,
      }
    : null;

  return (
    <div className="space-y-6">
      <AiSettingsForm existingKey={safeKey} usage={usage} apiToken={ws?.apiToken ?? null} />
    </div>
  );
}
