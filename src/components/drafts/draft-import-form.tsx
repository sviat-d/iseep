// src/components/drafts/draft-import-form.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createDrafts } from "@/actions/drafts";
import { parseDraftsInput, type ParsedDraft } from "@/lib/drafts/parse";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Target,
  Package,
  Layers,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  create_icp: { label: "New ICP", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Target },
  update_product: { label: "Update Product", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: Package },
  update_icp: { label: "Update ICP", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Target },
  create_segment: { label: "New Segment", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: Layers },
};

const PLACEHOLDER = `{
  "drafts": [
    {
      "target_type": "create_icp",
      "summary": "ICP for Creator Economy",
      "reasoning": "Based on your product context...",
      "payload": {
        "name": "Creator Economy",
        "description": "...",
        "criteria": [
          { "group": "firmographic", "category": "industry", "value": "Creator Economy", "intent": "qualify", "importance": 9 }
        ],
        "personas": [
          { "name": "Head of Finance" }
        ]
      }
    }
  ]
}`;

export function DraftImportForm() {
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedDraft[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleParse() {
    setParseError(null);
    const result = parseDraftsInput(text);
    if (!result.success) {
      setParseError(result.error);
      return;
    }
    setParsed(result.drafts);
    setStep("preview");
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createDrafts(text);
      if (result.error) {
        setParseError(result.error);
        setStep("paste");
        return;
      }
      setCreatedCount(result.ids?.length ?? 0);
      setStep("done");
    });
  }

  if (step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <div className="text-center">
            <p className="text-lg font-medium">
              {createdCount} suggestion{createdCount !== 1 ? "s" : ""} created
            </p>
            <p className="text-sm text-muted-foreground">
              Review and approve them in the suggestions inbox
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/drafts">
              <Button>
                Go to inbox
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button variant="outline" onClick={() => { setStep("paste"); setText(""); setParsed([]); }}>
              Import more
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {parsed.length} suggestion{parsed.length !== 1 ? "s" : ""} parsed
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("paste")}>
              Back
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${parsed.length} suggestion${parsed.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </div>
        {parsed.map((d, i) => {
          const config = TYPE_CONFIG[d.targetType] ?? { label: d.targetType, color: "bg-gray-100 text-gray-800", icon: Target };
          return (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 py-3">
                <config.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-sm font-medium">{d.summary}</span>
                  </div>
                  {d.reasoning && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {d.reasoning}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Step: paste
  return (
    <div className="space-y-4">
      {parseError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {parseError}
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={20}
        className="font-mono text-xs"
      />
      <Button onClick={handleParse} disabled={!text.trim()}>
        Parse suggestions
      </Button>
    </div>
  );
}
