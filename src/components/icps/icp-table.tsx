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
import { IcpEditDialog } from "@/components/icps/icp-edit-dialog";
import { ArrowUpDown } from "lucide-react";

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

const columnHelper = createColumnHelper<IcpRow>();

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

const STATUS_OPTIONS = ["all", "draft", "active", "archived"] as const;

export function IcpTable({ icps }: { icps: IcpRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => (
          <Link
            href={`/icps/${info.row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge variant={statusVariant[info.getValue()] ?? "outline"}>
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("version", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Version
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => <span className="text-muted-foreground">v{info.getValue()}</span>,
      }),
      columnHelper.accessor("qualifyCount", {
        header: "Qualify",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("excludeCount", {
        header: "Exclude",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("personaCount", {
        header: "Personas",
        cell: (info) => info.getValue(),
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
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <IcpEditDialog icp={info.row.original} />
        ),
      }),
    ],
    []
  );

  const filteredData = useMemo(() => {
    if (statusFilter === "all") return icps;
    return icps.filter((icp) => icp.status === statusFilter);
  }, [icps, statusFilter]);

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
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
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
                No ICPs found.
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
