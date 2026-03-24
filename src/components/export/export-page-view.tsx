"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  FileDown,
  Package,
  Target,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import type { GtmContextPackage, ExportFormat } from "@/lib/context-export/types";
import { toJson, toMarkdown, toClipboardText } from "@/lib/context-export/formatters";

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPageView({
  fullContext,
}: {
  fullContext: GtmContextPackage;
}) {
  const [includeProduct, setIncludeProduct] = useState(true);
  const [includeIcps, setIncludeIcps] = useState(true);
  const [includeScoring, setIncludeScoring] = useState(true);
  const [format, setFormat] = useState<ExportFormat>("clipboard");
  const [copied, setCopied] = useState(false);

  const hasProduct = !!fullContext.product;
  const hasIcps = !!fullContext.icps && fullContext.icps.length > 0;
  const hasScoring = !!fullContext.scoring && fullContext.scoring.totalRuns > 0;

  const filteredContext = useMemo<GtmContextPackage>(() => {
    const pkg: GtmContextPackage = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      workspace: fullContext.workspace,
    };
    if (includeProduct && fullContext.product) pkg.product = fullContext.product;
    if (includeIcps && fullContext.icps) pkg.icps = fullContext.icps;
    if (includeScoring && fullContext.scoring) pkg.scoring = fullContext.scoring;
    return pkg;
  }, [fullContext, includeProduct, includeIcps, includeScoring]);

  const formatted = useMemo(() => {
    switch (format) {
      case "json":
        return toJson(filteredContext);
      case "markdown":
        return toMarkdown(filteredContext);
      case "clipboard":
        return toClipboardText(filteredContext);
    }
  }, [filteredContext, format]);

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const companySlug = (fullContext.product?.companyName ?? fullContext.workspace.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const ext = format === "json" ? ".json" : ".md";
    const content = format === "json" ? toJson(filteredContext) : toMarkdown(filteredContext);
    downloadFile(content, `${companySlug}-gtm-context${ext}`);
  }

  const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
    { value: "clipboard", label: "Compact text" },
    { value: "markdown", label: "Markdown" },
    { value: "json", label: "JSON" },
  ];

  return (
    <div className="space-y-6">
      {!hasProduct && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-muted-foreground">
            Add product context to enrich your export —{" "}
            <Link href="/settings/product" className="font-medium text-foreground hover:underline">
              set up product info
            </Link>
          </p>
        </div>
      )}
      {!hasIcps && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-muted-foreground">
            Create your first ICP to include it in exports —{" "}
            <Link href="/icps" className="font-medium text-foreground hover:underline">
              manage ICPs
            </Link>
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeProduct}
              onChange={(e) => setIncludeProduct(e.target.checked)}
              disabled={!hasProduct}
              className="rounded"
            />
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            Product
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeIcps}
              onChange={(e) => setIncludeIcps(e.target.checked)}
              disabled={!hasIcps}
              className="rounded"
            />
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            ICPs
            {hasIcps && (
              <Badge variant="secondary" className="text-[10px]">
                {fullContext.icps!.length}
              </Badge>
            )}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeScoring}
              onChange={(e) => setIncludeScoring(e.target.checked)}
              disabled={!hasScoring}
              className="rounded"
            />
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            Scoring
          </label>
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormat(opt.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                format === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy to clipboard"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-muted-foreground">
            {formatted}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
