"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  enableSharing,
  disableSharing,
  updateShareMode,
} from "@/actions/sharing";
import { Share2, Copy, Check, Link2 } from "lucide-react";

type ShareMode = "without_stats" | "with_stats";

type IcpShareDialogProps = {
  icp: {
    id: string;
    shareToken: string | null;
    shareMode: string | null;
  };
};

export function IcpShareDialog({ icp }: IcpShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareToken, setShareToken] = useState(icp.shareToken);
  const [shareMode, setShareMode] = useState<ShareMode>(
    (icp.shareMode as ShareMode) ?? "without_stats"
  );
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isShared = shareToken != null;
  const shareUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/share/${shareToken}`
      : "";

  function handleEnable() {
    startTransition(async () => {
      const result = await enableSharing(icp.id, shareMode);
      if (result.success && result.shareToken) {
        setShareToken(result.shareToken);
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const result = await disableSharing(icp.id);
      if (result.success) {
        setShareToken(null);
      }
    });
  }

  function handleModeChange(mode: ShareMode) {
    setShareMode(mode);
    if (isShared) {
      startTransition(async () => {
        await updateShareMode(icp.id, mode);
      });
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="mr-1.5 h-3.5 w-3.5" />
        Share
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share ICP Profile</DialogTitle>
            <DialogDescription>
              {isShared
                ? "Shared via public link. Anyone with the link can view."
                : "Generate a public link to share this ICP."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Sharing mode</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange("without_stats")}
                  className={`rounded-lg border p-3 text-left text-xs transition-colors ${
                    shareMode === "without_stats"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  disabled={isPending}
                >
                  <p className="font-medium">Without stats</p>
                  <p className="text-muted-foreground mt-0.5">Criteria, personas, segments</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("with_stats")}
                  className={`rounded-lg border p-3 text-left text-xs transition-colors ${
                    shareMode === "with_stats"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  disabled={isPending}
                >
                  <p className="font-medium">With stats</p>
                  <p className="text-muted-foreground mt-0.5">+ win rate, deal counts</p>
                </button>
              </div>
            </div>

            {/* Share URL */}
            {isShared && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Public link</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 min-w-0 flex-1 items-center rounded-md border bg-muted/50 px-2.5">
                    <Link2 className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs text-muted-foreground">{shareUrl}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={isPending} className="shrink-0">
                    {copied ? <Check className="mr-1 h-3 w-3 text-green-600" /> : <Copy className="mr-1 h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}

            {/* Action */}
            <div className="flex justify-end pt-2">
              {isShared ? (
                <Button variant="destructive" size="sm" onClick={handleDisable} disabled={isPending}>
                  {isPending ? "Disabling..." : "Disable Sharing"}
                </Button>
              ) : (
                <Button size="sm" onClick={handleEnable} disabled={isPending}>
                  {isPending ? "Enabling..." : "Enable Sharing"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
