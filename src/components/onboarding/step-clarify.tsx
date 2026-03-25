"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, HelpCircle, ArrowLeft } from "lucide-react";
import { refineContext } from "@/actions/onboarding";
import { goBackOnboarding } from "@/actions/onboarding";
import type { ParsedContext } from "@/lib/onboarding-parser";

export function StepClarify({
  parsedContext,
}: {
  parsedContext: ParsedContext;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isRefining, startRefine] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit() {
    setError(null);
    startRefine(async () => {
      const result = await refineContext(answers);
      if (result.error) {
        setError(result.error);
      }
      // On success, advanceOnboarding(2) is called server-side → page reloads to step 3 (reveal)
    });
  }

  function handleSkip() {
    startRefine(async () => {
      const result = await refineContext({});
      if (result.error) {
        setError(result.error);
      }
    });
  }

  const { product, icp, missingQuestions } = parsedContext;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Let&apos;s refine your profile
        </h2>
        <p className="mt-2 text-muted-foreground">
          Here&apos;s what we extracted. Answer a few questions to make your ICP more precise.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* What we understood */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            What we understood
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {product.companyName && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Company</p>
              <p className="text-sm">{product.companyName}</p>
            </div>
          )}
          {product.productDescription && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Product</p>
              <p className="text-sm">{product.productDescription}</p>
            </div>
          )}
          {product.targetCustomers && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Target customers</p>
              <p className="text-sm">{product.targetCustomers}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {product.industriesFocus.map((ind) => (
              <Badge key={ind} variant="secondary" className="text-xs">
                {ind}
              </Badge>
            ))}
            {product.geoFocus.map((geo) => (
              <Badge key={geo} variant="outline" className="text-xs">
                {geo}
              </Badge>
            ))}
          </div>
          {icp.name && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">ICP detected</p>
              <p className="text-sm font-medium">{icp.name}</p>
              <p className="text-xs text-muted-foreground">
                {icp.criteria.length} criteria, {icp.personas.length} personas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clarification questions */}
      {missingQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-primary" />
              Help us fill the gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingQuestions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {q.question}
                </label>
                <Input
                  placeholder={q.hint}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  disabled={isRefining}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={isRefining}
          onClick={() => goBackOnboarding(0)}
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {missingQuestions.length > 0 && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isRefining}
            >
              Skip questions
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isRefining}
            size="lg"
          >
            {isRefining ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Creating your profile...
              </>
            ) : (
              "Continue →"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
