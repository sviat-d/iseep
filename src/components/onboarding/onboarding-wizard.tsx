"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target } from "lucide-react";
import { goBackOnboarding } from "@/actions/onboarding";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { StepContext } from "@/components/onboarding/step-context";
import { StepClarify } from "@/components/onboarding/step-clarify";
import { StepReveal } from "@/components/onboarding/step-reveal";
import type { ParsedContext } from "@/lib/onboarding-parser";

type OnboardingWizardProps = {
  step: number; // 0 = context, 1 = clarify, 2 = reveal
  parsedContext?: ParsedContext | null;
  revealData?: {
    company: {
      name: string | null;
      website: string | null;
      description: string | null;
      targetCustomers: string | null;
      industriesFocus: string[];
      geoFocus: string[];
    };
    products: Array<{
      name: string;
      shortDescription: string | null;
      description: string;
      coreUseCases: string[];
      keyValueProps: string[];
      pricingModel: string | null;
      avgTicket: string | null;
    }>;
    icps: Array<{
      id: string;
      name: string;
      description: string | null;
      criteriaCount: number;
      personaCount: number;
      qualifyCriteria: Array<{ category: string; value: string }>;
      riskCriteria: Array<{ category: string; value: string }>;
      excludeCriteria: Array<{ category: string; value: string }>;
      personas: Array<{ name: string }>;
    }>;
  } | null;
};

export function OnboardingWizard({ step, parsedContext, revealData }: OnboardingWizardProps) {
  const router = useRouter();
  const currentVisualStep = step + 1;

  // Push history entry per step so browser back works
  useEffect(() => {
    window.history.replaceState({ onboardingStep: step }, "");

    function handlePopState(e: PopStateEvent) {
      const prevStep = e.state?.onboardingStep;
      if (typeof prevStep === "number" && prevStep < step) {
        goBackOnboarding(prevStep).then(() => router.refresh());
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [step, router]);

  // Push new history entry when step advances
  useEffect(() => {
    if (step > 0) {
      window.history.pushState({ onboardingStep: step }, "");
    }
  }, [step]);

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
            <StepReveal company={revealData.company} products={revealData.products} icps={revealData.icps} />
          )}
        </div>
      </div>
    </div>
  );
}
