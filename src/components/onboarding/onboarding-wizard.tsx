"use client";

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
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-8">
        <OnboardingStepper currentStep={currentVisualStep} />
      </div>

      {step === 0 && <StepProduct defaultValues={productDefaults} />}
      {step === 1 && <StepIcp />}
      {step === 2 && <StepScoring />}
      {step === 3 && <StepDone />}
    </div>
  );
}
