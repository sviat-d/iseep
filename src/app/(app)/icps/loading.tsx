export default function IcpsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-lg border px-4 py-2.5">
        <div className="h-5 w-32 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-muted" />
        ))}
      </div>
      <div className="rounded-lg border px-4 py-2.5">
        <div className="h-5 w-40 rounded bg-muted" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-6 w-16 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-8 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
