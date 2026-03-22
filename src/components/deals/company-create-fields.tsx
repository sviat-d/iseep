"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompany } from "@/actions/companies";

type CompanyCreateFieldsProps = {
  onCreated: (company: { id: string; name: string }) => void;
  onCancel: () => void;
  industrySuggestions?: string[];
};

export function CompanyCreateFields({ onCreated, onCancel, industrySuggestions = [] }: CompanyCreateFieldsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<HTMLInputElement>(null);

  function handleCreate() {
    const name = nameRef.current?.value?.trim();
    if (!name) {
      setError("Company name is required");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    if (websiteRef.current?.value) formData.set("website", websiteRef.current.value);
    if (countryRef.current?.value) formData.set("country", countryRef.current.value);
    if (industryRef.current?.value) formData.set("industry", industryRef.current.value);

    startTransition(async () => {
      const result = await createCompany(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.companyId) {
        onCreated({ id: result.companyId, name });
      }
    });
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
      <p className="text-sm font-medium">Create New Company</p>
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="company-name">Company Name</Label>
          <Input ref={nameRef} id="company-name" placeholder="e.g. Acme Corp" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="company-website">Website</Label>
            <Input ref={websiteRef} id="company-website" placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="company-country">Country</Label>
            <Input ref={countryRef} id="company-country" placeholder="e.g. US" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="company-industry">Industry</Label>
          <Input ref={industryRef} id="company-industry" list="inline-industry-suggestions" placeholder="e.g. SaaS" />
          <datalist id="inline-industry-suggestions">
            {industrySuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={isPending} onClick={handleCreate}>
            {isPending ? "Creating..." : "Create Company"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
