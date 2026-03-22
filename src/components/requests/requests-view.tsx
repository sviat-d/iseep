"use client";

import { useState, useTransition } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RequestFormDialog } from "@/components/requests/request-form-dialog";
import { updateRequestStatus, deleteRequest } from "@/actions/requests";
import { MoreHorizontal, Trash2 } from "lucide-react";

type RequestRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  source: string;
  frequencyScore: number | null;
  icpId: string | null;
  icpName: string | null;
  dealId: string | null;
  createdAt: Date;
};

type IcpOption = { id: string; name: string };

const STATUS_FILTERS = ["all", "open", "validated", "planned", "rejected"] as const;

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  open: "secondary",
  validated: "default",
  planned: "outline",
  rejected: "destructive",
};

const TYPE_LABELS: Record<string, string> = {
  feature_request: "Feature Request",
  adjacent_product: "Adjacent Product",
  use_case: "Use Case",
  integration_request: "Integration",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  deal: "Deal",
  meeting_note: "Meeting Note",
};

const STATUS_TRANSITIONS = ["open", "validated", "planned", "rejected"];

export function RequestsView({
  requests,
  icps,
}: {
  requests: RequestRow[];
  icps: IcpOption[];
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateRequestStatus(id, status);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteRequest(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((opt) => (
            <Button
              key={opt}
              variant={statusFilter === opt ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(opt)}
            >
              {opt === "all" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Button>
          ))}
        </div>
        <RequestFormDialog icps={icps} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>ICP</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-8 text-center text-muted-foreground"
              >
                No requests found. Add your first product request to get started.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{req.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {TYPE_LABELS[req.type] ?? req.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[req.status] ?? "secondary"}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {req.icpName ?? (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  {req.frequencyScore ?? (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  {SOURCE_LABELS[req.source] ?? req.source}
                </TableCell>
                <TableCell>
                  {new Date(req.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-xs" disabled={isPending} />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUS_TRANSITIONS.filter((s) => s !== req.status).map(
                        (status) => (
                          <DropdownMenuItem
                            key={status}
                            onSelect={() => handleStatusChange(req.id, status)}
                          >
                            Mark as {status}
                          </DropdownMenuItem>
                        )
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => handleDelete(req.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
