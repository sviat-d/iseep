"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { mergeIndustryValue } from "@/actions/industry";

type IndustryInputProps = {
  suggestions: string[];
  defaultValue?: string;
  name?: string;
  id?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  placeholder?: string;
};

export function IndustryInput({
  suggestions: initialSuggestions,
  defaultValue = "",
  name,
  id,
  inputRef: externalRef,
  placeholder = "e.g. SaaS, FinTech",
}: IndustryInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [mergeDialog, setMergeDialog] = useState<{
    oldValue: string;
  } | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [isPending, startTransition] = useTransition();
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef ?? internalRef;
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on current input
  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(s: string) {
    setValue(s);
    if (ref.current) ref.current.value = s;
    setShowDropdown(false);
  }

  function handleDeleteClick(e: React.MouseEvent, s: string) {
    e.stopPropagation();
    setMergeDialog({ oldValue: s });
    setMergeTarget(suggestions.find((x) => x !== s) ?? "");
    setShowDropdown(false);
  }

  function handleMerge() {
    if (!mergeDialog || !mergeTarget) return;
    startTransition(async () => {
      const result = await mergeIndustryValue(
        mergeDialog.oldValue,
        mergeTarget
      );
      if (result.success) {
        // Remove old value from local suggestions
        setSuggestions((prev) =>
          prev.filter((s) => s !== mergeDialog.oldValue)
        );
        // If current value was the old one, update it
        if (value === mergeDialog.oldValue) {
          setValue(mergeTarget);
          if (ref.current) ref.current.value = mergeTarget;
        }
        setMergeDialog(null);
      }
    });
  }

  return (
    <div ref={wrapperRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <Input
        ref={ref as React.RefObject<HTMLInputElement>}
        id={id}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (ref.current) ref.current.value = e.target.value;
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        autoComplete="off"
      />

      {/* Custom dropdown */}
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md">
          {filtered.map((s) => (
            <div
              key={s}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              onClick={() => handleSelect(s)}
            >
              <span>{s}</span>
              <button
                type="button"
                className="ml-2 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                onClick={(e) => handleDeleteClick(e, s)}
                title={`Remove "${s}" and replace everywhere`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Merge confirmation dialog */}
      <Dialog
        open={mergeDialog !== null}
        onOpenChange={(open) => {
          if (!open) setMergeDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Replace &quot;{mergeDialog?.oldValue}&quot;
            </DialogTitle>
            <DialogDescription>
              This will replace &quot;{mergeDialog?.oldValue}&quot; everywhere in
              your workspace (companies, criteria) with the value you choose
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">Replace with:</p>
            <div className="space-y-1">
              {suggestions
                .filter((s) => s !== mergeDialog?.oldValue)
                .map((s) => (
                  <div
                    key={s}
                    className={`rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      mergeTarget === s
                        ? "border-primary bg-primary/5 font-medium"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setMergeTarget(s)}
                  >
                    {s}
                  </div>
                ))}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Or type a new value:
              </p>
              <Input
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                placeholder="Type replacement value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={isPending || !mergeTarget}>
              {isPending ? "Replacing..." : "Replace everywhere"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
