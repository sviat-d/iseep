"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteUpload } from "@/actions/scoring";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Trash2, ExternalLink } from "lucide-react";

type Upload = {
  id: string;
  fileName: string;
  sourceName?: string | null;
  totalRows: number;
  scoredAt: Date;
  createdAt: Date;
};

function pctWidth(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function FitMiniBar({ stats }: { stats?: { high: number; medium: number; low: number; risk: number; blocked: number; none: number; total: number } }) {
  if (!stats || stats.total === 0) return null;

  const segments = [
    { color: "bg-green-500", count: stats.high + stats.medium },
    { color: "bg-amber-500", count: stats.low + stats.risk },
    { color: "bg-red-500", count: stats.blocked },
    { color: "bg-gray-300 dark:bg-gray-600", count: stats.none },
  ];

  return (
    <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      {segments.map((seg, i) => {
        const w = pctWidth(seg.count, stats.total);
        if (w === 0) return null;
        return (
          <div
            key={i}
            className={seg.color}
            style={{ width: `${w}%` }}
          />
        );
      })}
    </div>
  );
}

export function ScoringList({
  uploads,
  uploadStats,
}: {
  uploads: Upload[];
  uploadStats?: Record<string, { high: number; medium: number; low: number; risk: number; blocked: number; none: number; total: number }>;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this upload and all scored results?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteUpload(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No uploads yet. Upload a CSV to start scoring leads against your ICPs.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Total Rows</TableHead>
          <TableHead>Fit Breakdown</TableHead>
          <TableHead>Scored</TableHead>
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {uploads.map((upload) => (
          <TableRow key={upload.id}>
            <TableCell>
              <Link
                href={`/scoring/${upload.id}`}
                className="inline-flex items-center gap-1.5 font-medium hover:underline"
              >
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                {upload.fileName}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {upload.sourceName || "\u2014"}
            </TableCell>
            <TableCell>{upload.totalRows.toLocaleString()}</TableCell>
            <TableCell>
              <FitMiniBar stats={uploadStats?.[upload.id]} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(upload.scoredAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 justify-end">
                <Link
                  href={`/scoring/${upload.id}`}
                  className="inline-flex items-center justify-center rounded-lg h-7 w-7 text-sm font-medium hover:bg-muted transition-colors"
                  title="View results"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(upload.id)}
                  disabled={isPending && deletingId === upload.id}
                  title="Delete upload"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
