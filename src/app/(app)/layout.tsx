import { AppShell } from "@/components/layout/app-shell";
import { getAuthContext } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  return <AppShell onboardingStep={ctx?.onboardingStep ?? 4}>{children}</AppShell>;
}
