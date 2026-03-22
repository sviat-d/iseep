"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { parseIcpAction, confirmImportIcps, getImportUsage } from "@/actions/import-icp";
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
  const [parsedIcps, setParsedIcps] = useState<ParsedIcp[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [icpIds, setIcpIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParseTransition] = useTransition();
  const [isCreating, startCreateTransition] = useTransition();
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  // Load usage on mount
  useEffect(() => {
    getImportUsage().then((u) => {
      if (u) setUsage(u);
    });
  }, []);

  // ---- Step 1: Extract ----

  function handleExtract() {
    setError(null);
    startParseTransition(async () => {
      const result = await parseIcpAction(text);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.parsed && result.parsed.length > 0) {
        setParsedIcps(result.parsed);
        setSelectedIndices(new Set(result.parsed.map((_, i) => i)));
        setStep(2);
        // Refresh usage count
        const u = await getImportUsage();
        if (u) setUsage(u);
      }
    });
  }

  // ---- Step 2: Edit helpers ----

  function toggleIcp(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function updateIcpName(index: number, name: string) {
    setParsedIcps((prev) =>
      prev.map((icp, i) => (i === index ? { ...icp, name } : icp))
    );
  }

  function updateIcpDescription(index: number, description: string) {
    setParsedIcps((prev) =>
      prev.map((icp, i) => (i === index ? { ...icp, description } : icp))
    );
  }

  function removeCriterion(icpIndex: number, criterionIndex: number) {
    setParsedIcps((prev) =>
      prev.map((icp, i) =>
        i === icpIndex
          ? { ...icp, criteria: icp.criteria.filter((_, ci) => ci !== criterionIndex) }
          : icp
      )
    );
  }

  function addCriterion(icpIndex: number) {
    setParsedIcps((prev) =>
      prev.map((icp, i) =>
        i === icpIndex
          ? {
              ...icp,
              criteria: [
                ...icp.criteria,
                {
                  group: "firmographic",
                  category: "industry",
                  value: "",
                  intent: "qualify" as const,
                  importance: 5,
                },
              ],
            }
          : icp
      )
    );
  }

  function removePersona(icpIndex: number, personaIndex: number) {
    setParsedIcps((prev) =>
      prev.map((icp, i) =>
        i === icpIndex
          ? { ...icp, personas: icp.personas.filter((_, pi) => pi !== personaIndex) }
          : icp
      )
    );
  }

  function addPersona(icpIndex: number) {
    setParsedIcps((prev) =>
      prev.map((icp, i) =>
        i === icpIndex
          ? {
              ...icp,
              personas: [...icp.personas, { name: "", description: "" }],
            }
          : icp
      )
    );
  }

  const selectedCount = selectedIndices.size;

  // ---- Step 2: Create ----

  function handleCreate() {
    if (selectedCount === 0) return;
    setError(null);
    const toImport = parsedIcps.filter((_, i) => selectedIndices.has(i));
    startCreateTransition(async () => {
      const result = await confirmImportIcps(toImport);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.icpIds) {
        setIcpIds(result.icpIds);
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
              Describe your ideal customer in plain text. We&apos;ll extract
              structured criteria, personas, and more. You can describe multiple
              ICPs in a single text.
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

            <div className="flex items-center justify-between">
              {usage && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {usage.used}/{usage.limit} AI extractions this month
                  </span>
                </div>
              )}
              <div className="ml-auto">
                <Button
                  onClick={handleExtract}
                  disabled={isParsing || !text.trim()}
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Extracting ICPs from your description...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      Extract ICPs
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview & Edit */}
      {step === 2 && parsedIcps.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Review Extracted ICPs</CardTitle>
              <CardDescription>
                Found {parsedIcps.length} ICP{parsedIcps.length !== 1 ? "s" : ""}.
                Select which ones to import and edit as needed.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* ICP Cards */}
          {parsedIcps.map((icp, icpIdx) => (
            <Card
              key={icpIdx}
              className={
                selectedIndices.has(icpIdx)
                  ? ""
                  : "opacity-50"
              }
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIndices.has(icpIdx)}
                    onChange={() => toggleIcp(icpIdx)}
                    className="mt-1 h-4 w-4 rounded border-input accent-primary"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`icp-name-${icpIdx}`}>ICP Name</Label>
                    <Input
                      id={`icp-name-${icpIdx}`}
                      value={icp.name}
                      onChange={(e) => updateIcpName(icpIdx, e.target.value)}
                    />
                    <Label htmlFor={`icp-desc-${icpIdx}`}>Description</Label>
                    <Textarea
                      id={`icp-desc-${icpIdx}`}
                      value={icp.description}
                      onChange={(e) => updateIcpDescription(icpIdx, e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Criteria */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Criteria ({icp.criteria.length})
                  </p>
                  {icp.criteria.length > 0 ? (
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
                          {icp.criteria.map((c, ci) => (
                            <TableRow key={ci}>
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
                                  onClick={() => removeCriterion(icpIdx, ci)}
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
                  <Button variant="outline" size="sm" onClick={() => addCriterion(icpIdx)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add criterion
                  </Button>
                </div>

                {/* Personas */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Personas ({icp.personas.length})
                  </p>
                  {icp.personas.length > 0 ? (
                    icp.personas.map((p, pi) => (
                      <div
                        key={pi}
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
                          onClick={() => removePersona(icpIdx, pi)}
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
                  <Button variant="outline" size="sm" onClick={() => addPersona(icpIdx)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add persona
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

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
              disabled={isCreating || selectedCount === 0}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import {selectedCount} ICP{selectedCount !== 1 ? "s" : ""}
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
              <p className="text-sm font-medium">
                Successfully imported {icpIds.length} ICP{icpIds.length !== 1 ? "s" : ""}!
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your ICPs have been created as drafts. Review and activate them when ready.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {icpIds.map((id, i) => (
                  <Link
                    key={id}
                    href={`/icps/${id}`}
                    className="inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                  >
                    View ICP {icpIds.length > 1 ? i + 1 : ""}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setText("");
                    setParsedIcps([]);
                    setSelectedIndices(new Set());
                    setIcpIds([]);
                    setError(null);
                  }}
                >
                  Import more
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
