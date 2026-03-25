"use client";

import { Check } from "lucide-react";

const STEPS = [
  { number: 1, label: "Product" },
  { number: 2, label: "ICP" },
  { number: 3, label: "Scoring" },
  { number: 4, label: "Done" },
];

export function OnboardingStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;

        return (
          <div key={step.number} className="flex items-center">
            {/* Connector line before step (skip first) */}
            {idx > 0 && (
              <div
                className={`h-0.5 w-10 sm:w-16 ${
                  STEPS[idx - 1].number < currentStep
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            )}

            <div className="flex flex-col items-center gap-1.5">
              {/* Circle */}
              {isCompleted ? (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" />
                </div>
              ) : isCurrent ? (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background">
                  <span className="text-xs font-semibold">{step.number}</span>
                </div>
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <span className="text-xs">{step.number}</span>
                </div>
              )}

              {/* Label */}
              <span
                className={`text-xs ${
                  isCompleted
                    ? "font-bold text-foreground"
                    : isCurrent
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
