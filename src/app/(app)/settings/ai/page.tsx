import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { db } from "@/db";
import { aiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMonthlyUsage } from "@/lib/ai-usage";

export default async function AiSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const [existingKey] = await db
    .select()
    .from(aiKeys)
    .where(eq(aiKeys.workspaceId, ctx.workspaceId));

  const usage = await getMonthlyUsage(ctx.workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Settings</h1>
        <p className="text-muted-foreground">
          Use your own API key for unlimited AI operations, or use iseep&apos;s built-in AI
        </p>
      </div>
      <AiSettingsForm existingKey={existingKey ?? null} usage={usage} />
    </div>
  );
}
