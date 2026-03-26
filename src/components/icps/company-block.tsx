"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Globe,
} from "lucide-react";
import { updateCompanyInfo } from "@/actions/company";

type CompanyData = {
  name: string;
  website: string | null;
  companyDescription: string | null;
  targetCustomers: string | null;
  industriesFocus: string[];
  geoFocus: string[];
};

export function CompanyBlock({ company }: { company: CompanyData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateCompanyInfo(formData);
      setEditing(false);
      router.refresh();
    });
  }

  const hasDetails =
    company.companyDescription ||
    company.website ||
    company.targetCustomers ||
    company.industriesFocus.length > 0 ||
    company.geoFocus.length > 0;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{company.name}</span>
        {company.website && (
          <span className="text-xs text-muted-foreground">{company.website}</span>
        )}
        {!hasDetails && (
          <span className="ml-auto text-[10px] text-muted-foreground/50">Click to add company info</span>
        )}
      </button>

      {open && !editing && (
        <div className="border-t px-4 py-3 space-y-2.5">
          {company.companyDescription && (
            <p className="text-sm text-muted-foreground">{company.companyDescription}</p>
          )}
          {company.targetCustomers && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Target customers</p>
              <p className="text-xs text-muted-foreground">{company.targetCustomers}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {company.industriesFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Industries</p>
                <div className="flex flex-wrap gap-1">
                  {company.industriesFocus.map((ind) => (
                    <Badge key={ind} variant="outline" className="text-[10px]">{ind}</Badge>
                  ))}
                </div>
              </div>
            )}
            {company.geoFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Regions</p>
                <div className="flex flex-wrap gap-1">
                  {company.geoFocus.map((geo) => (
                    <Badge key={geo} variant="outline" className="text-[10px]">{geo}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center h-7 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </button>
          </div>
        </div>
      )}

      {open && editing && (
        <div className="border-t px-4 py-3">
          <form action={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Company name</label>
                <Input name="name" defaultValue={company.name} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Website</label>
                <Input name="website" defaultValue={company.website ?? ""} placeholder="https://..." className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">What does your company do?</label>
              <Textarea
                name="companyDescription"
                defaultValue={company.companyDescription ?? ""}
                rows={2}
                placeholder="Brief description of your business"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target customers</label>
              <Input
                name="targetCustomers"
                defaultValue={company.targetCustomers ?? ""}
                placeholder="Who are your customers?"
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Industries (comma-separated)</label>
                <Input
                  name="industriesFocus"
                  defaultValue={company.industriesFocus.join(", ")}
                  placeholder="FinTech, E-commerce, ..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Regions (comma-separated)</label>
                <Input
                  name="geoFocus"
                  defaultValue={company.geoFocus.join(", ")}
                  placeholder="EU, LATAM, ..."
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
