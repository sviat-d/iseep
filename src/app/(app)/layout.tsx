import { AppShell } from "@/components/layout/app-shell";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let onboardingStep = 4;
  const ctx = await getAuthContext();
  if (ctx) {
    const [workspace] = await db
      .select({ onboardingStep: workspaces.onboardingStep })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);
    if (workspace) {
      onboardingStep = workspace.onboardingStep;
    }
  }
  return <AppShell onboardingStep={onboardingStep}>{children}</AppShell>;
}
