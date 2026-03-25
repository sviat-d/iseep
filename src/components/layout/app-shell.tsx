import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  onboardingStep = 4,
}: {
  children: React.ReactNode;
  onboardingStep?: number;
}) {
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
