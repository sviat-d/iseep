import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  onboardingStep = 4,
}: {
  children: React.ReactNode;
  onboardingStep?: number;
}) {
  // Fullscreen layout during onboarding — no sidebar, no topbar
  if (onboardingStep < 3) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onboardingStep={onboardingStep} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
