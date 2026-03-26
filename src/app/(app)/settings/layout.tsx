import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace configuration</p>
      </div>
      <div className="flex gap-8">
        <SettingsNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
