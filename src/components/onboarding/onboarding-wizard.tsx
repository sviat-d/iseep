"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { StepProduct } from "@/components/onboarding/step-product";
import { StepIcp } from "@/components/onboarding/step-icp";
import { StepScoring } from "@/components/onboarding/step-scoring";
import { StepDone } from "@/components/onboarding/step-done";

type OnboardingWizardProps = {
  step: number; // 0-3: last completed onboarding step
  productDefaults?: {
    companyName?: string;
    productDescription?: string;
    industriesFocus?: string;
    geoFocus?: string;
  };
};

export function OnboardingWizard({ step, productDefaults }: OnboardingWizardProps) {
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

      {/* Wizard content — centered */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-6 py-8">
          <div className="mb-8">
            <OnboardingStepper currentStep={currentVisualStep} />
          </div>

          {step === 0 && <StepProduct defaultValues={productDefaults} />}
          {step === 1 && <StepIcp />}
          {step === 2 && <StepScoring />}
          {step === 3 && <StepDone />}
        </div>
      </div>
    </div>
  );
}
