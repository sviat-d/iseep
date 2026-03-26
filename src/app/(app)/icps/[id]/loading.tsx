export default function IcpDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="h-4 w-80 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-8 w-8 rounded bg-muted" />
        </div>
      </div>
      <div className="flex gap-2 border-b pb-2">
        {["Criteria", "Personas", "Signals", "Segments", "Cases", "Versions"].map((t) => (
          <div key={t} className="h-8 w-20 rounded bg-muted" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 rounded-lg border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
