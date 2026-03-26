export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="mt-1 h-4 w-56 rounded bg-muted" />
      </div>
      <div className="flex gap-8">
        <div className="w-48 space-y-2">
          <div className="h-8 w-full rounded bg-muted" />
          <div className="h-8 w-full rounded bg-muted" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-32 rounded-lg border bg-muted/30" />
          <div className="h-32 rounded-lg border bg-muted/30" />
        </div>
      </div>
    </div>
  );
}
