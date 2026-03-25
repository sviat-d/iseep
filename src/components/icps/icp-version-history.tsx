"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveIcpSnapshot } from "@/actions/icps";
import { Save, Clock, GitCompare, Bot, Upload, User, Tag } from "lucide-react";
import { diffSnapshots, type DiffEntry } from "@/lib/icp-diff";
import type { IcpSnapshotData } from "@/lib/types";

type Snapshot = {
  id: string;
  version: number;
  changeSummary: string | null;
  note: string | null;
  source: string | null;
  tags: unknown;
  createdAt: Date;
  createdBy: string | null;
  icpId: string;
  workspaceId: string;
  snapshotData: unknown;
};

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof User; color: string }> = {
  manual: { label: "Manual", icon: User, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  agent: { label: "Agent", icon: Bot, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
  import: { label: "Import", icon: Upload, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  system: { label: "System", icon: Clock, color: "text-muted-foreground bg-muted" },
};

export function IcpVersionHistory({
  icpId,
  snapshots,
}: {
  icpId: string;
  snapshots: Snapshot[];
}) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [compareIdx, setCompareIdx] = useState<number | null>(null);

  function handleSave() {
    startTransition(async () => {
      await saveIcpSnapshot(icpId, note);
      setNote("");
      setSaveDialogOpen(false);
    });
  }

  // Compute diff between selected snapshot and its predecessor
  const diffEntries: DiffEntry[] | null = (() => {
    if (compareIdx === null) return null;
    const curr = snapshots[compareIdx];
    const prev = snapshots[compareIdx + 1]; // snapshots ordered DESC, so +1 is older
    if (!curr || !prev) return null;
    return diffSnapshots(
      prev.snapshotData as IcpSnapshotData,
      curr.snapshotData as IcpSnapshotData,
    );
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Version History</h3>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" />
            }
          >
            <Save className="mr-1 h-3 w-3" />
            Save Version
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save ICP Version</DialogTitle>
              <DialogDescription>
                Capture a snapshot of your current ICP definition. You can compare versions later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="snapshot-note">What changed?</Label>
                <Input
                  id="snapshot-note"
                  placeholder="e.g. Added compliance exclusions after Q1 review"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving..." : "Save Snapshot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {snapshots.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No snapshots yet. Save a version to track changes over time.
        </p>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snapshot, idx) => {
            const source = SOURCE_CONFIG[snapshot.source ?? "manual"] ?? SOURCE_CONFIG.manual;
            const SourceIcon = source.icon;
            const tags = Array.isArray(snapshot.tags) ? (snapshot.tags as string[]) : [];
            const canCompare = idx < snapshots.length - 1; // has a previous version
            const isComparing = compareIdx === idx;

            return (
              <div key={snapshot.id}>
                <div
                  className={`flex items-start gap-3 rounded-lg border p-4 ${
                    isComparing ? "border-primary bg-primary/[0.02]" : ""
                  }`}
                >
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">v{snapshot.version}</Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${source.color}`}
                      >
                        <SourceIcon className="mr-0.5 h-3 w-3" />
                        {source.label}
                      </Badge>
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] text-muted-foreground"
                        >
                          <Tag className="mr-0.5 h-2.5 w-2.5" />
                          {tag}
                        </Badge>
                      ))}
                      {snapshot.changeSummary && (
                        <span className="text-sm text-muted-foreground">
                          {snapshot.changeSummary}
                        </span>
                      )}
                    </div>
                    {snapshot.note && (
                      <p className="text-sm">{snapshot.note}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </p>
                      {canCompare && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setCompareIdx(isComparing ? null : idx)
                          }
                        >
                          <GitCompare className="h-3 w-3" />
                          {isComparing ? "Hide diff" : "Compare with previous"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Diff view */}
                {isComparing && diffEntries && (
                  <div className="ml-7 mt-2 rounded-md border bg-muted/30 p-3">
                    {diffEntries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No differences found (content-level changes may not be structural).
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          Changes from v{snapshots[idx + 1].version} → v{snapshot.version}
                        </p>
                        <div className="space-y-1">
                          {diffEntries.map((entry, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span className="shrink-0 font-medium text-muted-foreground w-20">
                                {entry.field}
                              </span>
                              <div className="flex-1">
                                {entry.before && (
                                  <span className="rounded bg-red-500/10 px-1 py-0.5 text-red-700 dark:text-red-400 line-through">
                                    {entry.before}
                                  </span>
                                )}
                                {entry.before && entry.after && " → "}
                                {entry.after && (
                                  <span className="rounded bg-green-500/10 px-1 py-0.5 text-green-700 dark:text-green-400">
                                    {entry.after}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
