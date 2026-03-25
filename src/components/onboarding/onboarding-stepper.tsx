import { Check } from "lucide-react";

const STEPS = [
  { label: "Context", step: 1 },
  { label: "Clarify", step: 2 },
  { label: "Your Profile", step: 3 },
];

export function OnboardingStepper({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="flex items-center justify-center gap-0 py-4">
      {STEPS.map((s, i) => {
        const isCompleted = currentStep > s.step;
        const isCurrent = currentStep === s.step;
        const isFuture = currentStep < s.step;

        return (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : s.step}
              </div>
              <span
                className={`text-xs ${
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isFuture
                      ? "text-muted-foreground"
                      : "font-medium text-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 h-0.5 w-12 transition-colors ${
                  currentStep > s.step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
