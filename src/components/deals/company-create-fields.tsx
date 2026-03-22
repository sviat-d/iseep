"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompany } from "@/actions/companies";

type CompanyCreateFieldsProps = {
  onCreated: (company: { id: string; name: string }) => void;
  onCancel: () => void;
};

export function CompanyCreateFields({ onCreated, onCancel }: CompanyCreateFieldsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCompany(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.companyId) {
        onCreated({
          id: result.companyId,
          name: formData.get("name") as string,
        });
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
      <form action={handleCreate} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="company-name">Company Name</Label>
          <Input id="company-name" name="name" placeholder="e.g. Acme Corp" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="company-website">Website</Label>
            <Input id="company-website" name="website" placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="company-country">Country</Label>
            <Input id="company-country" name="country" placeholder="e.g. US" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="company-industry">Industry</Label>
          <Input id="company-industry" name="industry" placeholder="e.g. SaaS" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Creating..." : "Create Company"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
