"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table2 } from "lucide-react";
import { IcpTable } from "@/components/icps/icp-table";
import { IcpCards } from "@/components/icps/icp-cards";

type IcpRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  qualifyCount: number;
  excludeCount: number;
  personaCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const STORAGE_KEY = "iseep-icp-view";

export function IcpListView({ icps }: { icps: IcpRow[] }) {
  const [view, setView] = useState<"table" | "grid">("table");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "grid" || saved === "table") {
      setView(saved);
    }
  }, []);

  function handleToggle(next: "table" | "grid") {
    setView(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-lg border p-0.5">
          <Button
            variant={view === "table" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => handleToggle("table")}
            aria-label="Table view"
          >
            <Table2 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => handleToggle("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {view === "table" ? <IcpTable icps={icps} /> : <IcpCards icps={icps} />}
    </div>
  );
}
