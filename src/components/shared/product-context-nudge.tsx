"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, X } from "lucide-react";

export function ProductContextNudge() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-2.5">
      <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm text-muted-foreground">
        Get smarter ICP and segment suggestions —{" "}
        <Link href="/settings/product" className="font-medium text-foreground hover:underline">
          add product info
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
