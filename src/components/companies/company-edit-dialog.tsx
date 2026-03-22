"use client";

import { useTransition, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndustryInput } from "@/components/shared/industry-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateCompany } from "@/actions/companies";
import { Pencil } from "lucide-react";

type CompanyEditDialogProps = {
  company: {
    id: string;
    name: string;
    website: string | null;
    country: string | null;
    industry: string | null;
    notes: string | null;
  };
  industrySuggestions: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CompanyEditDialog({
  company,
  industrySuggestions,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CompanyEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCompany(company.id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <>
      {controlledOpen === undefined && (
        <Button variant="outline" size="sm" onClick={() => setInternalOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      )}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={company.name}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  name="website"
                  defaultValue={company.website ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  name="country"
                  defaultValue={company.country ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <IndustryInput
                suggestions={industrySuggestions}
                name="industry"
                id="edit-industry"
                defaultValue={company.industry ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                name="notes"
                defaultValue={company.notes ?? ""}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
