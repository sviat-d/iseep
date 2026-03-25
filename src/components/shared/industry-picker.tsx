"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  getSectors,
  getChildren,
  searchIndustries,
} from "@/lib/taxonomy/lookup";

type IndustryPickerProps = {
  value: string;
  onChange: (value: string) => void;
  allowParent?: boolean;
  multiple?: boolean;
  placeholder?: string;
};

export function IndustryPicker({
  value,
  onChange,
  allowParent = true,
  multiple = false,
  placeholder = "Select industry...",
}: IndustryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Parse current values (comma-separated for multiple)
  const selectedValues = useMemo(() => {
    if (!value) return [];
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }, [value]);

  const sectors = useMemo(() => getSectors(), []);
  const filteredNodes = useMemo(
    () => (search ? searchIndustries(search) : []),
    [search],
  );

  function handleSelect(name: string) {
    if (multiple) {
      const exists = selectedValues.some(
        (v) => v.toLowerCase() === name.toLowerCase(),
      );
      let next: string[];
      if (exists) {
        next = selectedValues.filter(
          (v) => v.toLowerCase() !== name.toLowerCase(),
        );
      } else {
        next = [...selectedValues, name];
      }
      onChange(next.join(", "));
    } else {
      onChange(name);
      setOpen(false);
      setSearch("");
    }
  }

  function handleRemove(name: string) {
    const next = selectedValues.filter(
      (v) => v.toLowerCase() !== name.toLowerCase(),
    );
    onChange(next.join(", "));
  }

  function handleCustom() {
    if (search.trim()) {
      handleSelect(search.trim());
      setSearch("");
    }
  }

  const isSelected = (name: string) =>
    selectedValues.some((v) => v.toLowerCase() === name.toLowerCase());

  const displayValue = multiple ? null : value || null;

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal"
        onClick={() => setOpen(!open)}
      >
        {displayValue ? (
          <span className="truncate">{displayValue}</span>
        ) : (
          <span className="text-muted-foreground">
            {multiple && selectedValues.length > 0
              ? `${selectedValues.length} selected`
              : placeholder}
          </span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border bg-popover shadow-md">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search industries..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>
                {search.trim() ? (
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded-md"
                    onClick={handleCustom}
                  >
                    Add custom: &quot;{search.trim()}&quot;
                  </button>
                ) : (
                  "No industries found."
                )}
              </CommandEmpty>

              {search ? (
                <CommandGroup>
                  {filteredNodes.slice(0, 50).map((node) => (
                    <CommandItem
                      key={node.id}
                      value={node.id}
                      onSelect={() => handleSelect(node.name)}
                      disabled={!allowParent && node.parentId === null}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 shrink-0 ${isSelected(node.name) ? "opacity-100" : "opacity-0"}`}
                      />
                      <span
                        className={
                          node.parentId === null ? "font-semibold" : ""
                        }
                      >
                        {node.name}
                      </span>
                      {node.parentId === null && (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px]"
                        >
                          Sector
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                sectors.map((sector) => {
                  const children = getChildren(sector.id);
                  return (
                    <CommandGroup key={sector.id} heading={sector.name}>
                      {allowParent && (
                        <CommandItem
                          value={`sector-${sector.id}`}
                          onSelect={() => handleSelect(sector.name)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 shrink-0 ${isSelected(sector.name) ? "opacity-100" : "opacity-0"}`}
                          />
                          <span className="font-semibold">
                            All {sector.name}
                          </span>
                        </CommandItem>
                      )}
                      {children.map((child) => (
                        <CommandItem
                          key={child.id}
                          value={child.id}
                          onSelect={() => handleSelect(child.name)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 shrink-0 ${isSelected(child.name) ? "opacity-100" : "opacity-0"}`}
                          />
                          {child.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })
              )}
            </CommandList>
          </Command>
        </div>
      )}

      {/* Multi-select: show selected as badges */}
      {multiple && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">
              {v}
              <button
                type="button"
                className="ml-1 hover:text-destructive"
                onClick={() => handleRemove(v)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
