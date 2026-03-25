"use client";

import { useEffect, useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import {
  runOnboardingScoring,
  advanceOnboarding,
  type ScoringSummary,
} from "@/actions/onboarding";

const FIT_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-700 dark:text-green-400",
  borderline: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  blocked: "bg-red-500/10 text-red-700 dark:text-red-400",
  unmatched: "bg-muted text-muted-foreground",
};

export function StepScoring() {
  const [isPending, startTransition] = useTransition();
  const [isFinishing, startFinish] = useTransition();
  const [result, setResult] = useState<ScoringSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  function runScoring() {
    setError(null);
    startTransition(async () => {
      const res = await runOnboardingScoring();
      if (res.error) {
        setError(res.error);
      } else if (res.summary) {
        setResult(res.summary);
      }
      setHasRun(true);
    });
  }

  // Auto-run on mount
  useEffect(() => {
    if (!hasRun) {
      runScoring();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFinish() {
    startFinish(async () => {
      await advanceOnboarding(3);
    });
  }

  // Loading state
  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Scoring sample leads...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={runScoring}>
          Try again
        </Button>
      </div>
    );
  }

  // Success state
  if (result) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Sample scoring results
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We scored sample leads against your ICPs. Here's the breakdown.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBadge label="High fit" count={result.highFit} color={FIT_COLORS.high} />
          <StatBadge label="Borderline" count={result.borderline} color={FIT_COLORS.borderline} />
          <StatBadge label="Blocked" count={result.blocked} color={FIT_COLORS.blocked} />
          <StatBadge label="Unmatched" count={result.unmatched} color={FIT_COLORS.unmatched} />
        </div>

        {/* Top matches */}
        {result.topLeads && result.topLeads.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Top matches</h3>
            <div className="space-y-2">
              {result.topLeads.slice(0, 5).map((lead, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{lead.companyName}</p>
                    {lead.industry && (
                      <p className="text-xs text-muted-foreground">
                        {lead.industry}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={FIT_COLORS[lead.fitLevel] ?? ""}
                    >
                      {lead.fitLevel}
                    </Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {lead.fitScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleFinish} disabled={isFinishing}>
            {isFinishing && <Loader2 className="animate-spin" />}
            Finish &rarr;
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function StatBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg p-3 text-center ${color}`}>
      <p className="text-2xl font-bold tabular-nums">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
