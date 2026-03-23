"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { processSampleData } from "@/actions/scoring";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

export function SampleDataTrigger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [triggered, setTriggered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("mode") === "sample" && !triggered) {
      setTriggered(true);
      startTransition(async () => {
        const result = await processSampleData();
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.uploadId) {
          router.push(`/scoring/${result.uploadId}`);
        }
      });
    }
  }, [searchParams, triggered, router]);

  if (searchParams.get("mode") !== "sample") return null;

  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-3 py-8">
        {error ? (
          <div className="text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              className="mt-2 text-sm text-primary hover:underline"
              onClick={() => router.push("/scoring")}
            >
              Go back
            </button>
          </div>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Scoring sample data...</p>
              <p className="text-sm text-muted-foreground">
                Testing 20 example companies against your ICPs
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
