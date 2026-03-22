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
import { Save, Clock } from "lucide-react";

type Snapshot = {
  id: string;
  version: number;
  changeSummary: string | null;
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
  icpId: string;
  workspaceId: string;
  snapshotData: unknown;
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

  function handleSave() {
    startTransition(async () => {
      await saveIcpSnapshot(icpId, note);
      setNote("");
      setSaveDialogOpen(false);
    });
  }

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
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{snapshot.version}</Badge>
                  {snapshot.changeSummary && (
                    <span className="text-sm text-muted-foreground">
                      {snapshot.changeSummary}
                    </span>
                  )}
                </div>
                {snapshot.note && (
                  <p className="text-sm">{snapshot.note}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(snapshot.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
