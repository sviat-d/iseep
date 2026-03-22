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
import { Label } from "@/components/ui/label";
import { createContact } from "@/actions/contacts";

type ContactFormDialogProps = {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContactFormDialog({
  companyId,
  open,
  onOpenChange,
}: ContactFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", companyId);
    startTransition(async () => {
      const result = await createContact(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>Add a new contact to this company</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact-fullName">Full Name</Label>
            <Input
              id="contact-fullName"
              name="fullName"
              placeholder="e.g. Jane Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-title">Title</Label>
            <Input
              id="contact-title"
              name="title"
              placeholder="e.g. VP of Engineering"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              placeholder="e.g. jane@acme.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-linkedinUrl">LinkedIn URL</Label>
            <Input
              id="contact-linkedinUrl"
              name="linkedinUrl"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
