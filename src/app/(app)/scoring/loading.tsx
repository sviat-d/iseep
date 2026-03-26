export default function ScoringLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
