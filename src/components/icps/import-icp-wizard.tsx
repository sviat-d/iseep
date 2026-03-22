"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { parseIcpAction, confirmImportIcp } from "@/actions/import-icp";
import type { ParsedIcp } from "@/lib/icp-parser";
import { GROUP_LABELS, PROPERTY_OPTIONS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryLabel(category: string): string {
  const option = PROPERTY_OPTIONS.find((o) => o.category === category);
  return option?.label ?? category;
}

function IntentBadge({ intent }: { intent: string }) {
  switch (intent) {
    case "qualify":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Good fit
        </Badge>
      );
    case "risk":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          Risk
        </Badge>
      );
    case "exclude":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Not a fit
        </Badge>
      );
    default:
      return <Badge variant="secondary">{intent}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PLACEHOLDER_TEXT = `Example:

Our ideal customer is a mid-market SaaS company (50-500 employees) in the EU or US.
They should be in the FinTech or E-commerce space, using modern payment infrastructure.
We look for companies already processing crypto payments or actively evaluating them.

Key buyer: VP of Engineering or Head of Payments, reports to CTO.
Secondary: Compliance Officer who evaluates regulatory risk.

We avoid companies in AML-restricted jurisdictions or those under regulatory investigation.
Companies in UK/US with complex licensing are borderline — worth exploring but risky.`;

export function ImportIcpWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [text, setText] = useState("");
  const [parsedIcp, setParsedIcp] = useState<ParsedIcp | null>(null);
  const [icpId, setIcpId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParseTransition] = useTransition();
  const [isCreating, startCreateTransition] = useTransition();

  // ---- Step 1: Parse ----

  function handleParse() {
    setError(null);
    startParseTransition(async () => {
      const result = await parseIcpAction(text);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.parsed) {
        setParsedIcp(result.parsed);
        setStep(2);
      }
    });
  }

  // ---- Step 2: Edit helpers ----

  function updateName(name: string) {
    if (!parsedIcp) return;
    setParsedIcp({ ...parsedIcp, name });
  }

  function updateDescription(description: string) {
    if (!parsedIcp) return;
    setParsedIcp({ ...parsedIcp, description });
  }

  function removeCriterion(index: number) {
    if (!parsedIcp) return;
    setParsedIcp({
      ...parsedIcp,
      criteria: parsedIcp.criteria.filter((_, i) => i !== index),
    });
  }

  function addCriterion() {
    if (!parsedIcp) return;
    setParsedIcp({
      ...parsedIcp,
      criteria: [
        ...parsedIcp.criteria,
        {
          group: "firmographic",
          category: "industry",
          value: "",
          intent: "qualify",
          importance: 5,
        },
      ],
    });
  }

  function removePersona(index: number) {
    if (!parsedIcp) return;
    setParsedIcp({
      ...parsedIcp,
      personas: parsedIcp.personas.filter((_, i) => i !== index),
    });
  }

  function addPersona() {
    if (!parsedIcp) return;
    setParsedIcp({
      ...parsedIcp,
      personas: [
        ...parsedIcp.personas,
        { name: "", description: "" },
      ],
    });
  }

  // ---- Step 2: Create ----

  function handleCreate() {
    if (!parsedIcp) return;
    setError(null);
    startCreateTransition(async () => {
      const result = await confirmImportIcp(parsedIcp);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.icpId) {
        setIcpId(result.icpId);
        setStep(3);
      }
    });
  }

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Step 1: Paste */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Paste ICP Description</CardTitle>
            <CardDescription>
              Describe your ideal customer in plain text. We'll extract
              structured criteria, personas, and more.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER_TEXT}
              className="min-h-48"
              rows={10}
            />

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleParse}
                disabled={isParsing || !text.trim()}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Analyzing your ICP description...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Parse
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview & Edit */}
      {step === 2 && parsedIcp && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Parsed ICP</CardTitle>
              <CardDescription>
                Review and edit the extracted data before creating the ICP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="icp-name">ICP Name</Label>
                <Input
                  id="icp-name"
                  value={parsedIcp.name}
                  onChange={(e) => updateName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="icp-description">Description</Label>
                <Textarea
                  id="icp-description"
                  value={parsedIcp.description}
                  onChange={(e) => updateDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>
                Criteria ({parsedIcp.criteria.length})
              </CardTitle>
              <CardDescription>
                Properties extracted from your description.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {parsedIcp.criteria.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Importance</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedIcp.criteria.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground text-xs">
                            {GROUP_LABELS[c.group] ?? c.group}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getCategoryLabel(c.category)}
                          </TableCell>
                          <TableCell>{c.value}</TableCell>
                          <TableCell>
                            <IntentBadge intent={c.intent} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.intent === "qualify" ? (c.importance ?? "-") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeCriterion(i)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No criteria extracted.
                </p>
              )}

              <Button variant="outline" size="sm" onClick={addCriterion}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add criterion
              </Button>
            </CardContent>
          </Card>

          {/* Personas */}
          <Card>
            <CardHeader>
              <CardTitle>
                Personas ({parsedIcp.personas.length})
              </CardTitle>
              <CardDescription>
                Buyer roles extracted from your description.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {parsedIcp.personas.length > 0 ? (
                parsedIcp.personas.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.name || "Untitled persona"}</p>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removePersona(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No personas extracted.
                </p>
              )}

              <Button variant="outline" size="sm" onClick={addPersona}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add persona
              </Button>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setError(null);
              }}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !parsedIcp.name.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create ICP
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-4 h-8 w-8 text-green-600" />
              <p className="text-sm font-medium">ICP created successfully!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your ICP has been created with{" "}
                {parsedIcp?.criteria.length ?? 0} criteria and{" "}
                {parsedIcp?.personas.length ?? 0} personas.
              </p>
              <div className="mt-6 flex items-center gap-3">
                {icpId && (
                  <Link
                    href={`/icps/${icpId}`}
                    className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                  >
                    View ICP
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setText("");
                    setParsedIcp(null);
                    setIcpId(null);
                    setError(null);
                  }}
                >
                  Import another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
