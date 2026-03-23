"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ClusterDraft } from "@/lib/cluster-draft";
import { saveClusterAsIcp } from "@/actions/cluster-icp";
import { GROUP_LABELS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Lightbulb,
  Plus,
  Save,
  Trash2,
  Building2,
  Users,
  ListChecks,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Criterion = ClusterDraft["criteria"][number];
type Persona = ClusterDraft["personas"][number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceBadgeVariant(
  confidence: "high" | "medium" | "low",
): "default" | "secondary" | "outline" {
  switch (confidence) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
  }
}

function intentIcon(intent: string): string {
  switch (intent) {
    case "qualify":
      return "\u2705";
    case "risk":
      return "\u26a0\ufe0f";
    case "exclude":
      return "\u274c";
    default:
      return "";
  }
}

function intentLabel(intent: string): string {
  switch (intent) {
    case "qualify":
      return "Qualify";
    case "risk":
      return "Risk";
    case "exclude":
      return "Exclude";
    default:
      return intent;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ClusterReview({
  draft,
  uploadId,
  uploadName,
}: {
  draft: ClusterDraft;
  uploadId: string;
  uploadName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Editable state
  const [name, setName] = useState(draft.suggestedName);
  const [description, setDescription] = useState(draft.description);
  const [draftCriteria, setDraftCriteria] = useState<Criterion[]>(
    draft.criteria,
  );
  const [draftPersonas, setDraftPersonas] = useState<Persona[]>(
    draft.personas,
  );
  const [error, setError] = useState<string | null>(null);

  // Criteria editing
  function removeCriterion(index: number) {
    setDraftCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCriterion(index: number, updates: Partial<Criterion>) {
    setDraftCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    );
  }

  function addCriterion() {
    setDraftCriteria((prev) => [
      ...prev,
      {
        group: "firmographic",
        category: "",
        value: "",
        intent: "qualify" as const,
        importance: 5,
      },
    ]);
  }

  // Persona editing
  function removePersona(index: number) {
    setDraftPersonas((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePersona(index: number, updates: Partial<Persona>) {
    setDraftPersonas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    );
  }

  function addPersona() {
    setDraftPersonas((prev) => [...prev, { name: "", description: "" }]);
  }

  // Save
  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveClusterAsIcp(
        name,
        description,
        draftCriteria,
        draftPersonas,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.icpId) {
        router.push(`/icps/${result.icpId}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/scoring/${uploadId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to results
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Suggested ICP: {draft.suggestedName}
        </h1>
        <p className="text-muted-foreground">
          Draft &middot; Generated from scoring run &ldquo;{uploadName}&rdquo;
        </p>
      </div>

      {/* Section 1: Why this was suggested */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Why this was suggested
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{draft.whySuggested}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Confidence:</span>
            <Badge variant={confidenceBadgeVariant(draft.confidence)}>
              {draft.confidence.charAt(0).toUpperCase() +
                draft.confidence.slice(1)}{" "}
              ({draft.exampleCompanies.length} lead
              {draft.exampleCompanies.length !== 1 ? "s" : ""})
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Example companies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Example companies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.exampleCompanies.map((company, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.country ?? "\u2014"}</TableCell>
                  <TableCell>
                    {company.website ? (
                      <a
                        href={
                          company.website.startsWith("http")
                            ? company.website
                            : `https://${company.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {company.website}
                      </a>
                    ) : (
                      "\u2014"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 3: Draft criteria (editable) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Draft criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Importance</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftCriteria.map((criterion, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <select
                      value={criterion.group}
                      onChange={(e) =>
                        updateCriterion(i, { group: e.target.value })
                      }
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {Object.entries(GROUP_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={criterion.category}
                      onChange={(e) =>
                        updateCriterion(i, { category: e.target.value })
                      }
                      className="h-7 w-28"
                      placeholder="e.g. industry"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={criterion.value}
                      onChange={(e) =>
                        updateCriterion(i, { value: e.target.value })
                      }
                      className="h-7"
                      placeholder="Value"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        criterion.intent === "qualify"
                          ? "default"
                          : criterion.intent === "risk"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {intentIcon(criterion.intent)}{" "}
                      {intentLabel(criterion.intent)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={criterion.importance ?? 5}
                      onChange={(e) =>
                        updateCriterion(i, {
                          importance: parseInt(e.target.value) || 5,
                        })
                      }
                      className="h-7 w-14 text-center"
                    />
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
          <Button variant="outline" size="sm" onClick={addCriterion}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add criterion
          </Button>
        </CardContent>
      </Card>

      {/* Section 4: Draft personas (editable) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Draft personas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {draftPersonas.map((persona, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="flex-1 space-y-2">
                <Input
                  value={persona.name}
                  onChange={(e) => updatePersona(i, { name: e.target.value })}
                  placeholder="Persona name"
                  className="font-medium"
                />
                <Input
                  value={persona.description}
                  onChange={(e) =>
                    updatePersona(i, { description: e.target.value })
                  }
                  placeholder="Description"
                />
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removePersona(i)}
                className="mt-1"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPersona}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add persona
          </Button>
        </CardContent>
      </Card>

      {/* Section 5: Save */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Save as ICP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="icp-name">ICP Name</Label>
            <Input
              id="icp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="icp-description">Description</Label>
            <Textarea
              id="icp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Status: <Badge variant="outline">Draft</Badge>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isPending}>
              <Save className="mr-1.5 h-4 w-4" />
              {isPending ? "Saving..." : "Save as ICP"}
            </Button>
            <Link href={`/scoring/${uploadId}`}>
              <Button variant="outline">Back to results</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
