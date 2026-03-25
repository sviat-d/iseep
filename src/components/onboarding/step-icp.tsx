"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, PenLine, SkipForward, Loader2 } from "lucide-react";
import { parseIcpAction, confirmImportIcps } from "@/actions/import-icp";
import { advanceOnboarding } from "@/actions/onboarding";
import type { ParsedIcp } from "@/lib/icp-parser";

export function StepIcp() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsedIcps, setParsedIcps] = useState<ParsedIcp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParse] = useTransition();
  const [isCreating, startCreate] = useTransition();
  const [isSkipping, startSkip] = useTransition();
  const [isManual, startManual] = useTransition();

  function handleParse() {
    setError(null);
    startParse(async () => {
      const result = await parseIcpAction(text);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.parsed) {
        setParsedIcps(result.parsed);
      }
    });
  }

  function handleCreate() {
    if (!parsedIcps) return;
    setError(null);
    startCreate(async () => {
      const result = await confirmImportIcps(parsedIcps);
      if (result.error) {
        setError(result.error);
        return;
      }
      await advanceOnboarding(2);
    });
  }

  function handleManual() {
    startManual(async () => {
      await advanceOnboarding(2);
      router.push("/icps/new");
    });
  }

  function handleSkip() {
    startSkip(async () => {
      await advanceOnboarding(2);
    });
  }

  const anyPending = isParsing || isCreating || isSkipping || isManual;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Define your Ideal Customer Profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe who your best customers are, and we'll structure it into
          scoring criteria.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Option A: AI-assisted */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Describe your ideal customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g. Mid-market SaaS companies in North America with 50-500 employees, using Stripe or Adyen, focused on B2B payments..."
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={anyPending}
          />

          {!parsedIcps && (
            <Button
              onClick={handleParse}
              disabled={!text.trim() || anyPending}
            >
              {isParsing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Parse with AI
            </Button>
          )}

          {/* Preview parsed ICPs */}
          {parsedIcps && parsedIcps.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Found {parsedIcps.length} ICP{parsedIcps.length > 1 ? "s" : ""}:
              </p>
              <div className="space-y-2">
                {parsedIcps.map((icp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{icp.name}</p>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary">
                          {icp.criteria.length} criteria
                        </Badge>
                        <Badge variant="secondary">
                          {icp.personas.length} persona{icp.personas.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleCreate} disabled={anyPending}>
                {isCreating && <Loader2 className="animate-spin" />}
                Create ICPs
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Option B & C */}
      <div className="flex items-center gap-3">
        <Button variant="outline" disabled={anyPending} onClick={handleManual}>
          {isManual ? (
            <Loader2 className="animate-spin" />
          ) : (
            <PenLine className="size-4" />
          )}
          Create manually
        </Button>

        <Button variant="ghost" onClick={handleSkip} disabled={anyPending}>
          {isSkipping ? (
            <Loader2 className="animate-spin" />
          ) : (
            <SkipForward className="size-4" />
          )}
          Skip for now
        </Button>
      </div>
    </div>
  );
}
