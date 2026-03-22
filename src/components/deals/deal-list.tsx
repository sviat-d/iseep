"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
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
import { ArrowUpDown } from "lucide-react";

type DealRow = {
  id: string;
  title: string;
  dealValue: string | null;
  currency: string | null;
  stage: string | null;
  outcome: string;
  companyName: string;
  companyId: string;
  icpId: string | null;
  icpName: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const columnHelper = createColumnHelper<DealRow>();

const outcomeVariant: Record<string, "default" | "destructive" | "secondary"> = {
  won: "default",
  lost: "destructive",
  open: "secondary",
};

const OUTCOME_OPTIONS = ["all", "open", "won", "lost"] as const;

export function DealList({ deals }: { deals: DealRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => (
          <Link
            href={`/deals/${info.row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("companyName", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Company
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("icpName", {
        header: "ICP",
        cell: (info) => info.getValue() ?? <span className="text-muted-foreground">--</span>,
      }),
      columnHelper.accessor("stage", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Stage
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => (
          <span className="capitalize">{info.getValue() ?? "discovery"}</span>
        ),
      }),
      columnHelper.accessor("outcome", {
        header: "Outcome",
        cell: (info) => {
          const value = info.getValue();
          return (
            <Badge
              variant={outcomeVariant[value] ?? "secondary"}
              className={value === "won" ? "bg-emerald-600 text-white" : undefined}
            >
              {value}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("dealValue", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Value
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => {
          const val = info.getValue();
          const currency = info.row.original.currency ?? "USD";
          if (!val) return <span className="text-muted-foreground">--</span>;
          return `${currency} ${Number(val).toLocaleString()}`;
        },
        sortingFn: (a, b) => {
          const aVal = Number(a.original.dealValue ?? 0);
          const bVal = Number(b.original.dealValue ?? 0);
          return aVal - bVal;
        },
      }),
      columnHelper.accessor("createdAt", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      }),
    ],
    []
  );

  const filteredData = useMemo(() => {
    if (outcomeFilter === "all") return deals;
    return deals.filter((d) => d.outcome === outcomeFilter);
  }, [deals, outcomeFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {OUTCOME_OPTIONS.map((opt) => (
          <Button
            key={opt}
            variant={outcomeFilter === opt ? "default" : "outline"}
            size="sm"
            onClick={() => setOutcomeFilter(opt)}
          >
            {opt === "all" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}
          </Button>
        ))}
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-muted-foreground py-8"
              >
                No deals found.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
