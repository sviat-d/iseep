"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  enableSharing,
  disableSharing,
  updateShareMode,
} from "@/actions/sharing";
import { Share2, Copy, Check, Link2, EyeOff, BarChart3 } from "lucide-react";

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share ICP Profile</DialogTitle>
            <DialogDescription>
              {isShared
                ? "This ICP is shared via a public link. Anyone with the link can view it."
                : "Generate a public link to share this ICP profile with anyone."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Sharing mode</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange("without_stats")}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    shareMode === "without_stats"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  }`}
                  disabled={isPending}
                >
                  <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Without stats</p>
                    <p className="text-xs text-muted-foreground">
                      Share qualitative ICP info only — criteria, personas,
                      segments
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange("with_stats")}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    shareMode === "with_stats"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  }`}
                  disabled={isPending}
                >
                  <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">With stats</p>
                    <p className="text-xs text-muted-foreground">
                      Include performance metrics — win rate, deal counts
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Share URL (only when shared) */}
            {isShared && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Public link</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 flex-1 items-center overflow-hidden rounded-lg border bg-muted/50 px-3">
                    <Link2 className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm text-muted-foreground">
                      {shareUrl}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={isPending}
                  >
                    {copied ? (
                      <Check className="mr-1 h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="mr-1 h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {isShared ? (
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={isPending}
              >
                {isPending ? "Disabling..." : "Disable Sharing"}
              </Button>
            ) : (
              <Button onClick={handleEnable} disabled={isPending}>
                {isPending ? "Enabling..." : "Enable Sharing"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
