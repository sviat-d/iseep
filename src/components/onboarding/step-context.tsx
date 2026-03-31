"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardPaste, Sparkles, Upload, Copy, Check, CheckCircle2 } from "lucide-react";
import { parseContext } from "@/actions/onboarding";

const AI_PROMPT = `Help me describe my business for a sales intelligence tool. Ask me questions if you need more details, then write a complete summary covering:

1. Company & Product — what we do, our core product/service, key value propositions
2. Target Customers — who buys from us: industries, company sizes, regions, typical job titles of buyers
3. Good-Fit Signals — what makes a company a great customer for us
4. Risk / Red Flags — what makes a company a poor fit or high-risk
5. Compliance & Constraints — any regulatory, licensing, or geographic restrictions
6. Use Cases — top 3-5 practical use cases our customers have
7. Competitive Edge — why customers choose us over alternatives

Be specific: name real industries, regions, company sizes, and buyer roles. Write in plain language, no bullet-point lists — use full sentences so the tool can extract structured data from your response.`;

export function StepContext() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"paste" | "prompt" | "upload" | null>(null);
  const [isParsing, startParse] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Animated progress during parsing
  useEffect(() => {
    if (!isParsing) {
      setProgressStep(0);
      return;
    }
    const timers = [
      setTimeout(() => setProgressStep(1), 800),
      setTimeout(() => setProgressStep(2), 2500),
      setTimeout(() => setProgressStep(3), 5000),
      setTimeout(() => setProgressStep(4), 8000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isParsing]);

  function handleParse() {
    if (!text.trim()) return;
    setError(null);
    startParse(async () => {
      const result = await parseContext(text);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        setText(content);
        setMode("paste");
      }
    };
    reader.readAsText(file);
  }

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(AI_PROMPT);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Tell iseep about your business
        </h2>
        <p className="mt-2 text-muted-foreground">
          Paste your company context and we&apos;ll extract everything we need — product info, target customers, and your first ICP. No forms.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Mode selection — only shown before choosing */}
      {!mode && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => setMode("paste")}
          >
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <ClipboardPaste className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="text-sm font-semibold">Paste context</p>
                <p className="text-xs text-muted-foreground">
                  Company info, product, customers
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => setMode("prompt")}
          >
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <Sparkles className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="text-sm font-semibold">Use AI prompt</p>
                <p className="text-xs text-muted-foreground">
                  Run in Claude/ChatGPT, paste result
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => {
              fileRef.current?.click();
            }}
          >
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <Upload className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="text-sm font-semibold">Upload file</p>
                <p className="text-xs text-muted-foreground">
                  .md or .txt
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Prompt helper */}
      {mode === "prompt" && !text && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Ready-to-use prompt
            </CardTitle>
            <CardDescription>
              Copy this prompt, run it in Claude or ChatGPT, then paste the result below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {AI_PROMPT}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPrompt}
            >
              {promptCopied ? (
                <Check className="mr-1.5 h-3 w-3 text-green-600" />
              ) : (
                <Copy className="mr-1.5 h-3 w-3" />
              )}
              {promptCopied ? "Copied!" : "Copy prompt"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress display during parsing */}
      {isParsing && (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-center text-sm font-medium">Analyzing your context...</p>
              <div className="mx-auto max-w-xs space-y-2.5">
                {[
                  "Reading your context",
                  "Extracting product info",
                  "Identifying customer segments",
                  "Generating ICP criteria",
                  "Preparing clarification questions",
                ].map((label, i) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2.5 text-sm transition-opacity duration-300 ${
                      progressStep > i
                        ? "opacity-100"
                        : progressStep === i
                          ? "opacity-100"
                          : "opacity-30"
                    }`}
                  >
                    {progressStep > i ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : progressStep === i ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted" />
                    )}
                    <span className={progressStep > i ? "text-foreground" : progressStep === i ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Textarea — shown after mode selection, hidden during parsing */}
      {mode && !isParsing && (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === "prompt"
                ? "Paste the AI-generated response here..."
                : "Paste anything about your company — product description, target customers, ICP notes, investor deck text, Notion docs, sales playbook excerpts..."
            }
            rows={10}
            className="min-h-[200px]"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {text.length > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {text.length} chars
                </Badge>
              )}
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setMode(null);
                  setText("");
                }}
              >
                ← Change input method
              </button>
            </div>

            <Button
              onClick={handleParse}
              disabled={!text.trim()}
              size="lg"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Analyze context
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
