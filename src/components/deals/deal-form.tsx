"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyCreateFields } from "@/components/deals/company-create-fields";
import type { ActionResult } from "@/lib/types";

type Company = {
  id: string;
  name: string;
  website: string | null;
  country: string | null;
  industry: string | null;
  notes: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type IcpOption = { id: string; name: string };

type DealFormProps = {
  action: (formData: FormData) => Promise<ActionResult | void>;
  companies: Company[];
  icps: IcpOption[];
};

const STAGE_OPTIONS = [
  { value: "discovery", label: "Discovery" },
  { value: "qualification", label: "Qualification" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed", label: "Closed" },
];

const OUTCOME_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGE_OPTIONS.map((s) => [s.value, s.label])
);
const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.value, o.label])
);

export function DealForm({ action, companies: initialCompanies, icps }: DealFormProps) {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await action(formData);
    return result ?? null;
  }, null);

  const [companyId, setCompanyId] = useState("");
  const [icpId, setIcpId] = useState("");
  const [stage, setStage] = useState("discovery");
  const [outcome, setOutcome] = useState("open");
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [companies, setCompanies] = useState(initialCompanies);

  function handleCompanySelect(val: string | null) {
    if (!val) return;
    if (val === "__create_new__") {
      setShowCreateCompany(true);
      setCompanyId("");
    } else {
      setShowCreateCompany(false);
      setCompanyId(val);
    }
  }

  function handleCompanyCreated(company: { id: string; name: string }) {
    setCompanies((prev) => [
      ...prev,
      {
        id: company.id,
        name: company.name,
        website: null,
        country: null,
        industry: null,
        notes: null,
        workspaceId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    setCompanyId(company.id);
    setShowCreateCompany(false);
  }

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="icpId" value={icpId} />
          <input type="hidden" name="stage" value={stage} />
          <input type="hidden" name="outcome" value={outcome} />

          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Enterprise license deal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <Select
              value={companyId || (showCreateCompany ? "__create_new__" : "")}
              onValueChange={handleCompanySelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a company">
                  {companyId
                    ? companies.find((c) => c.id === companyId)?.name ?? "Select a company"
                    : showCreateCompany
                      ? "Create new..."
                      : "Select a company"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id} label={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value="__create_new__" label="Create new...">
                  + Create new company
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCreateCompany && (
            <CompanyCreateFields
              onCreated={handleCompanyCreated}
              onCancel={() => setShowCreateCompany(false)}
            />
          )}

          <div className="space-y-2">
            <Label>ICP (optional)</Label>
            <Select value={icpId} onValueChange={(v) => setIcpId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an ICP">
                  {icpId
                    ? icps.find((i) => i.id === icpId)?.name ?? "Select an ICP"
                    : "Select an ICP"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" label="None">
                  None
                </SelectItem>
                {icps.map((icp) => (
                  <SelectItem key={icp.id} value={icp.id} label={icp.name}>
                    {icp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => { if (v) setStage(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {STAGE_LABELS[stage] ?? stage}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} label={s.label}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={(v) => { if (v) setOutcome(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {OUTCOME_LABELS[outcome] ?? outcome}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} label={o.label}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dealValue">Deal Value</Label>
              <Input
                id="dealValue"
                name="dealValue"
                type="number"
                placeholder="e.g. 50000"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue="USD"
                placeholder="USD"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Deal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
