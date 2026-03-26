"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { addEvidence, deleteEvidence } from "@/actions/evidence";

type EvidenceItem = {
  id: string;
  companyName: string;
  outcome: string;
  reasonTags: unknown;
  note: string | null;
  industry: string | null;
  region: string | null;
  date: Date | null;
  createdAt: Date;
};

const REASON_TAG_SUGGESTIONS = [
  "payout volume fit",
  "high-risk vertical fit",
  "compliance mismatch",
  "geography mismatch",
  "weak use case",
  "pricing mismatch",
  "integration complexity",
  "strong product fit",
  "champion present",
  "budget available",
  "timing right",
  "competitor won",
  "no urgency",
];

export function IcpFeedbackTab({
  icpId,
  evidence,
}: {
  icpId: string;
  evidence: EvidenceItem[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "won" | "lost">("all");
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const wonCount = evidence.filter((e) => e.outcome === "won").length;
  const lostCount = evidence.filter((e) => e.outcome === "lost").length;

  const filtered =
    filter === "all"
      ? evidence
      : evidence.filter((e) => e.outcome === filter);

  function handleAddTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setCustomTag("");
  }

  function handleRemoveTag(tag: string) {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  }

  function handleSubmit(formData: FormData) {
    formData.set("reasonTags", selectedTags.join(","));
    startTransition(async () => {
      await addEvidence(formData);
      setShowForm(false);
      setSelectedTags([]);
    });
  }

  function handleDelete(evidenceId: string) {
    startTransition(async () => {
      await deleteEvidence(evidenceId, icpId);
    });
  }

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="font-medium">{wonCount}</span>
          <span className="text-muted-foreground">won</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="font-medium">{lostCount}</span>
          <span className="text-muted-foreground">lost</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Filter chips */}
          {(["all", "won", "lost"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "all" ? "All" : f === "won" ? "Won" : "Lost"}
            </button>
          ))}
        </div>
      </div>

      {/* Add evidence button */}
      {!showForm && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add evidence
        </Button>
      )}

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form action={handleSubmit} className="space-y-3">
              <input type="hidden" name="icpId" value={icpId} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Company name *
                  </label>
                  <Input
                    name="companyName"
                    placeholder="Acme Corp"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Outcome *
                  </label>
                  <div className="mt-1 flex gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="outcome"
                        value="won"
                        required
                        className="accent-green-600"
                      />
                      <span className="text-sm">Won</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="outcome"
                        value="lost"
                        className="accent-red-500"
                      />
                      <span className="text-sm">Lost</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Industry
                  </label>
                  <Input
                    name="industry"
                    placeholder="e.g., FinTech"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Region
                  </label>
                  <Input
                    name="region"
                    placeholder="e.g., EU"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Date
                  </label>
                  <Input name="date" type="date" className="mt-1" />
                </div>
              </div>

              {/* Reason tags */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Reason tags
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs cursor-pointer gap-1"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {REASON_TAG_SUGGESTIONS.filter(
                    (t) => !selectedTags.includes(t)
                  )
                    .slice(0, 8)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Custom tag..."
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(customTag);
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Note
                </label>
                <Textarea
                  name="note"
                  rows={2}
                  placeholder="Why did this company fit or not fit?"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedTags([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Adding..." : "Add evidence"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Evidence list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No evidence yet. Add won/lost company examples to validate this ICP.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const tags = Array.isArray(item.reasonTags)
              ? (item.reasonTags as string[])
              : [];
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border px-4 py-3"
              >
                {item.outcome === "won" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {item.companyName}
                    </span>
                    {item.industry && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.industry}
                      </Badge>
                    )}
                    {item.region && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.region}
                      </Badge>
                    )}
                    {item.date && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className={`text-[10px] ${
                            item.outcome === "won"
                              ? "bg-green-500/10 text-green-700"
                              : "bg-red-500/10 text-red-700"
                          }`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
