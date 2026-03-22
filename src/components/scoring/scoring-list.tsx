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
  totalRows: number;
  scoredAt: Date;
  createdAt: Date;
};

export function ScoringList({ uploads }: { uploads: Upload[] }) {
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
          <TableHead>Total Rows</TableHead>
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
            <TableCell>{upload.totalRows.toLocaleString()}</TableCell>
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
