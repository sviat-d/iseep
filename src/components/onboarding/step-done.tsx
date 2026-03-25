"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, LayoutDashboard, Loader2 } from "lucide-react";
import { advanceOnboarding } from "@/actions/onboarding";

export function StepDone() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeCard, setActiveCard] = useState<string | null>(null);

  function handleUpload() {
    setActiveCard("upload");
    startTransition(async () => {
      await advanceOnboarding(4);
      router.push("/scoring/upload");
    });
  }

  function handleDashboard() {
    setActiveCard("dashboard");
    startTransition(async () => {
      await advanceOnboarding(4);
      // Page reloads to show dashboard (layout re-reads onboardingStep)
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          You're ready!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your workspace is set up. Here's what to do next.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleUpload}
          disabled={isPending}
          className="text-left"
        >
          <Card className="h-full cursor-pointer transition-colors hover:ring-primary/30">
            <CardContent className="flex items-start gap-3 pt-1">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {isPending && activeCard === "upload" ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <Upload className="size-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Upload your leads</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Score your real leads against your ICPs
                </p>
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={handleDashboard}
          disabled={isPending}
          className="text-left"
        >
          <Card className="h-full cursor-pointer transition-colors hover:ring-primary/30">
            <CardContent className="flex items-start gap-3 pt-1">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                {isPending && activeCard === "dashboard" ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <LayoutDashboard className="size-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Explore dashboard</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  See your workspace overview and metrics
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
}
