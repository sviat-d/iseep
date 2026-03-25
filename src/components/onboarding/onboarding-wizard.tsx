"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { StepContext } from "@/components/onboarding/step-context";
import { StepClarify } from "@/components/onboarding/step-clarify";
import { StepReveal } from "@/components/onboarding/step-reveal";
import type { ParsedContext } from "@/lib/onboarding-parser";

type OnboardingWizardProps = {
  step: number; // 0 = context, 1 = clarify, 2 = reveal
  parsedContext?: ParsedContext | null;
  revealData?: {
    product: {
      companyName: string | null;
      productDescription: string;
      coreUseCases: string[];
      keyValueProps: string[];
      industriesFocus: string[];
      geoFocus: string[];
    };
    icp: {
      id: string;
      name: string;
      description: string | null;
      criteriaCount: number;
      personaCount: number;
      qualifyCriteria: Array<{ category: string; value: string }>;
      riskCriteria: Array<{ category: string; value: string }>;
      excludeCriteria: Array<{ category: string; value: string }>;
      personas: Array<{ name: string }>;
    };
  } | null;
};

export function OnboardingWizard({ step, parsedContext, revealData }: OnboardingWizardProps) {
  const currentVisualStep = step + 1;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal header with logo */}
      <header className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">iseep</span>
        </Link>
      </header>

      {/* Wizard content */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="mb-8">
            <OnboardingStepper currentStep={currentVisualStep} />
          </div>

          {step === 0 && <StepContext />}
          {step === 1 && parsedContext && (
            <StepClarify parsedContext={parsedContext} />
          )}
          {step === 2 && revealData && (
            <StepReveal product={revealData.product} icp={revealData.icp} />
          )}
        </div>
      </div>
    </div>
  );
}
