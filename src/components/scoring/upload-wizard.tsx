"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MAPPABLE_FIELDS } from "@/lib/scoring";
import { processUpload, processSampleData } from "@/actions/scoring";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ArrowRight, Loader2, CheckCircle2, AlertCircle, FlaskConical } from "lucide-react";

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

function parseCSV(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line
      .split(",")
      .map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Auto-detect mapping
// ---------------------------------------------------------------------------

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const fieldPatterns: [string, RegExp][] = [
    ["company_name", /company|org|business/i],
    ["industry", /industry|sector|vertical/i],
    ["country", /country|nation/i],
    ["region", /region|geo|area/i],
    ["website", /website|url|domain/i],
    ["contact_name", /name|contact|person/i],
    ["contact_email", /email|mail/i],
    ["contact_title", /title|role|position|job/i],
    ["company_size", /size|employees|headcount/i],
    ["platform", /platform/i],
    ["tech_stack", /tech|stack|tools/i],
  ];

  for (const header of headers) {
    for (const [field, pattern] of fieldPatterns) {
      if (pattern.test(header) && !Object.values(mapping).includes(field)) {
        mapping[header] = field;
        break;
      }
    }
  }
  return mapping;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "upload" | "mapping" | "processing";

export function UploadWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Step
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Source name state
  const [sourceName, setSourceName] = useState("");

  // Mapping state
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Processing state
  const [error, setError] = useState<string | null>(null);

  // ---- File handling ----

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        setError("Could not parse CSV headers");
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const detected = autoDetectMapping(parsed.headers);
      setMapping(detected);
      setStep("mapping");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ---- Sample data ----

  function handleSampleData() {
    setStep("processing");
    setError(null);
    startTransition(async () => {
      const result = await processSampleData();
      if (result.error) {
        setError(result.error);
        setStep("upload");
        return;
      }
      if (result.uploadId) {
        router.push(`/scoring/${result.uploadId}`);
      }
    });
  }

  // ---- Mapping change ----

  function updateMapping(csvColumn: string, field: string | null) {
    setMapping((prev) => {
      const next = { ...prev };
      if (!field || field === "__skip__") {
        delete next[csvColumn];
      } else {
        next[csvColumn] = field;
      }
      return next;
    });
  }

  // Already-assigned fields (to prevent duplicate mapping)
  const assignedFields = new Set(Object.values(mapping));

  // ---- Process ----

  function handleScore() {
    setStep("processing");
    setError(null);
    startTransition(async () => {
      const result = await processUpload(
        fileName,
        rows,
        mapping,
        sourceName || undefined,
      );
      if (result.error) {
        setError(result.error);
        setStep("mapping");
        return;
      }
      if (result.uploadId) {
        router.push(`/scoring/${result.uploadId}`);
      }
    });
  }

  // ---- Recommended fields check ----

  const recommendedFields = ["industry", "country"];
  const mappedFieldKeys = new Set(Object.values(mapping));
  const missingRecommended = recommendedFields.filter(
    (f) => !mappedFieldKeys.has(f)
  );

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <>
          {/* Try sample data card */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New here? Try sample data</p>
                <p className="text-xs text-muted-foreground">
                  Score 20 diverse companies instantly to see how ICP scoring works
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSampleData}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="mr-1.5 h-4 w-4" />
                )}
                Try sample data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Drag and drop a .csv file or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source name input */}
              <div className="space-y-1.5">
                <Label htmlFor="source-name">Source (optional)</Label>
                <Input
                  id="source-name"
                  placeholder="e.g. Web Summit 2026, Apollo export, Clay list v2"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              </div>

              {/* File drop zone */}
              <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop your CSV here</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map your CSV columns to scoring fields. Detected{" "}
              {headers.length} columns and {rows.length} data rows from{" "}
              <span className="font-medium">{fileName}</span>.
              {sourceName && (
                <>
                  {" "}Source: <span className="font-medium">{sourceName}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preview (first 3 rows)
              </p>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 3).map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((h) => (
                          <TableCell key={h} className="text-xs">
                            {row[h] || "\u2014"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mapping */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Column Mapping
              </p>
              <div className="space-y-2">
                {headers.map((csvColumn) => {
                  const currentValue = mapping[csvColumn] ?? "__skip__";
                  return (
                    <MappingRow
                      key={csvColumn}
                      csvColumn={csvColumn}
                      currentValue={currentValue}
                      assignedFields={assignedFields}
                      onChange={(field) => updateMapping(csvColumn, field)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Recommendation */}
            {missingRecommended.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  For best scoring, map at least:{" "}
                  {missingRecommended
                    .map(
                      (f) =>
                        MAPPABLE_FIELDS.find((mf) => mf.key === f)?.label ?? f
                    )
                    .join(", ")}
                </span>
              </div>
            )}

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
                  setStep("upload");
                  setHeaders([]);
                  setRows([]);
                  setMapping({});
                  setFileName("");
                  setError(null);
                }}
              >
                Back
              </Button>
              <Button onClick={handleScore}>
                Score {rows.length} Leads
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Processing */}
      {step === "processing" && (
        <Card>
          <CardHeader>
            <CardTitle>Scoring in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {isPending ? (
                <>
                  <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">
                    Scoring {rows.length > 0 ? `${rows.length} leads` : "sample data"} against your ICPs...
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This may take a moment
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mb-4 h-8 w-8 text-green-600" />
                  <p className="text-sm font-medium">
                    Scoring complete! Redirecting...
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mapping Row -- isolated to keep Select controlled cleanly
// ---------------------------------------------------------------------------

function MappingRow({
  csvColumn,
  currentValue,
  assignedFields,
  onChange,
}: {
  csvColumn: string;
  currentValue: string;
  assignedFields: Set<string>;
  onChange: (field: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {csvColumn}
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Select
        value={currentValue}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue>
            {currentValue === "__skip__"
              ? "Skip"
              : MAPPABLE_FIELDS.find((f) => f.key === currentValue)?.label ??
                currentValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__skip__" label="Skip">
            Skip
          </SelectItem>
          {MAPPABLE_FIELDS.map((field) => {
            const isAssigned =
              assignedFields.has(field.key) && field.key !== currentValue;
            return (
              <SelectItem
                key={field.key}
                value={field.key}
                label={field.label}
                disabled={isAssigned}
              >
                {field.label}
                {isAssigned && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (mapped)
                  </span>
                )}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
