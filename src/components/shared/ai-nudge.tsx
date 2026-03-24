"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

export function AiNudge({ message }: { message?: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/[0.03] px-4 py-2.5">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-muted-foreground">
        {message ?? "Improve parsing, matching, and suggestions"} —{" "}
        <Link
          href="/settings/ai"
          className="font-medium text-foreground hover:underline"
        >
          connect your AI provider
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
