"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, FileDown } from "lucide-react";
import type { GtmContextPackage } from "@/lib/context-export/types";
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

export function ContextExportButton({
  context,
  label = "Copy context",
}: {
  context: GtmContextPackage;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(toClipboardText(context));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const companySlug = (context.product?.companyName ?? context.workspace.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="relative inline-flex">
      <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-r-none">
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="mr-1.5 h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : label}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="-ml-px rounded-l-none border-l px-1.5"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                downloadFile(toMarkdown(context), `${companySlug}-gtm-context.md`);
                setMenuOpen(false);
              }}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download as Markdown
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                downloadFile(toJson(context), `${companySlug}-gtm-context.json`);
                setMenuOpen(false);
              }}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
