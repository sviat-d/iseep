"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IndustryPicker } from "@/components/shared/industry-picker";
import { saveProductContext } from "@/actions/product-context";
import { advanceOnboarding } from "@/actions/onboarding";
import { Loader2 } from "lucide-react";

type StepProductProps = {
  defaultValues?: {
    companyName?: string;
    productDescription?: string;
    industriesFocus?: string;
    geoFocus?: string;
  };
};

export function StepProduct({ defaultValues }: StepProductProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [industries, setIndustries] = useState(
    defaultValues?.industriesFocus ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    setError(null);
    startTransition(async () => {
      const form = formRef.current;
      if (!form) return;

      const formData = new FormData(form);
      const description = (formData.get("productDescription") as string)?.trim();

      if (description) {
        const result = await saveProductContext(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
      }

      await advanceOnboarding(1);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Tell iseep about your product
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This helps iseep evaluate market opportunities and suggest better ICPs.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form ref={formRef} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            name="companyName"
            placeholder="e.g. Acme Corp"
            defaultValue={defaultValues?.companyName ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productDescription">
            What does your company do?
          </Label>
          <Textarea
            id="productDescription"
            name="productDescription"
            placeholder="e.g. We provide crypto payment infrastructure for online businesses"
            rows={3}
            defaultValue={defaultValues?.productDescription ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label>Industries you focus on</Label>
          <IndustryPicker
            value={industries}
            onChange={setIndustries}
            multiple
            placeholder="Select industries..."
          />
          <input type="hidden" name="industriesFocus" value={industries} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="geoFocus">Regions you focus on</Label>
          <Input
            id="geoFocus"
            name="geoFocus"
            placeholder="e.g. North America, Europe"
            defaultValue={defaultValues?.geoFocus ?? ""}
          />
        </div>
      </form>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Next &rarr;
        </Button>
      </div>
    </div>
  );
}
