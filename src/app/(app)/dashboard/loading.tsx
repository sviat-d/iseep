export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-40 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="h-5 w-36 rounded bg-muted" />
        <div className="h-8 w-full rounded bg-muted" />
      </div>
    </div>
  );
}
