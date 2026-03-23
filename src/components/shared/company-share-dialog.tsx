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
import { Badge } from "@/components/ui/badge";
import {
  enableCompanySharing,
  disableCompanySharing,
  updateCompanyShareConfig,
} from "@/actions/company-sharing";
import {
  Globe,
  Copy,
  Check,
  Link2,
  Settings2,
  ExternalLink,
} from "lucide-react";

type ShareMode = "without_stats" | "with_stats";

type Icp = {
  id: string;
  name: string;
  status: string;
};

type CompanyShareDialogProps = {
  profileShareToken: string | null;
  profileShareMode: string | null;
  profileSharedIcpIds: string[] | null;
  allIcps: Icp[];
};

export function CompanyShareBanner({
  profileShareToken,
  profileShareMode,
  profileSharedIcpIds,
  allIcps,
}: CompanyShareDialogProps) {
  const [shareToken, setShareToken] = useState(profileShareToken);
  const [shareMode, setShareMode] = useState<ShareMode>(
    (profileShareMode as ShareMode) ?? "without_stats",
  );
  const [selectedIcpIds, setSelectedIcpIds] = useState<string[] | null>(
    profileSharedIcpIds,
  );
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isShared = shareToken != null;
  const shareUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/share/company/${shareToken}`
      : "";

  const activeIcps = allIcps.filter((i) => i.status === "active");
  const isAllSelected = selectedIcpIds === null;

  function handleEnable() {
    startTransition(async () => {
      const result = await enableCompanySharing(shareMode, selectedIcpIds);
      if (result.success && result.shareToken) {
        setShareToken(result.shareToken);
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const result = await disableCompanySharing();
      if (result.success) {
        setShareToken(null);
        setSettingsOpen(false);
      }
    });
  }

  function handleModeChange(mode: ShareMode) {
    setShareMode(mode);
    if (isShared) {
      startTransition(async () => {
        await updateCompanyShareConfig(mode, selectedIcpIds);
      });
    }
  }

  function toggleIcp(icpId: string) {
    let next: string[] | null;
    if (isAllSelected) {
      next = activeIcps.filter((i) => i.id !== icpId).map((i) => i.id);
    } else {
      const has = selectedIcpIds!.includes(icpId);
      if (has) {
        next = selectedIcpIds!.filter((id) => id !== icpId);
        if (next.length === 0) next = null;
      } else {
        next = [...selectedIcpIds!, icpId];
      }
      if (next && next.length === activeIcps.length) {
        next = null;
      }
    }
    setSelectedIcpIds(next);
    if (isShared) {
      startTransition(async () => {
        await updateCompanyShareConfig(shareMode, next);
      });
    }
  }

  function selectAll() {
    setSelectedIcpIds(null);
    if (isShared) {
      startTransition(async () => {
        await updateCompanyShareConfig(shareMode, null);
      });
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function isIcpSelected(icpId: string) {
    return isAllSelected || (selectedIcpIds?.includes(icpId) ?? false);
  }

  // ── Active: green banner with link ──
  if (isShared) {
    return (
      <>
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-900/30 dark:bg-green-950/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <Globe className="h-4 w-4 text-green-700 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Company Profile is public
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {shareMode === "with_stats" ? "With stats" : "Without stats"}
                  </Badge>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs text-muted-foreground">
                    {shareUrl}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Preview
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          shareMode={shareMode}
          onModeChange={handleModeChange}
          activeIcps={activeIcps}
          isAllSelected={isAllSelected}
          selectedIcpIds={selectedIcpIds}
          isIcpSelected={isIcpSelected}
          toggleIcp={toggleIcp}
          selectAll={selectAll}
          handleDisable={handleDisable}
          isPending={isPending}
        />
      </>
    );
  }

  // ── Inactive: CTA banner ──
  return (
    <>
      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Share your Company Profile
              </p>
              <p className="text-xs text-muted-foreground">
                Let partners, agencies, and advisors see who your ideal
                customers are
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleEnable} disabled={isPending}>
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            {isPending ? "Creating..." : "Create public profile"}
          </Button>
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        shareMode={shareMode}
        onModeChange={handleModeChange}
        activeIcps={activeIcps}
        isAllSelected={isAllSelected}
        selectedIcpIds={selectedIcpIds}
        isIcpSelected={isIcpSelected}
        toggleIcp={toggleIcp}
        selectAll={selectAll}
        handleDisable={handleDisable}
        isPending={isPending}
      />
    </>
  );
}

// ── Settings Dialog (shared between states) ──

function SettingsDialog({
  open,
  onOpenChange,
  shareMode,
  onModeChange,
  activeIcps,
  isAllSelected,
  selectedIcpIds,
  isIcpSelected,
  toggleIcp,
  selectAll,
  handleDisable,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareMode: ShareMode;
  onModeChange: (mode: ShareMode) => void;
  activeIcps: Icp[];
  isAllSelected: boolean;
  selectedIcpIds: string[] | null;
  isIcpSelected: (id: string) => boolean;
  toggleIcp: (id: string) => void;
  selectAll: () => void;
  handleDisable: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Company Profile Settings</DialogTitle>
          <DialogDescription>
            Configure what visitors see on your public profile page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sharing mode */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Sharing mode</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onModeChange("without_stats")}
                className={`flex-1 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  shareMode === "without_stats"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                disabled={isPending}
              >
                <p className="font-medium">Without stats</p>
                <p className="text-muted-foreground">
                  Product info, ICPs, criteria
                </p>
              </button>
              <button
                type="button"
                onClick={() => onModeChange("with_stats")}
                className={`flex-1 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  shareMode === "with_stats"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                disabled={isPending}
              >
                <p className="font-medium">With stats</p>
                <p className="text-muted-foreground">
                  + win rate, deal counts
                </p>
              </button>
            </div>
          </div>

          {/* ICP selection */}
          {activeIcps.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  ICPs to include (
                  {isAllSelected ? "all" : (selectedIcpIds?.length ?? 0)})
                </p>
                {!isAllSelected && (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-primary hover:underline"
                    disabled={isPending}
                  >
                    Select all
                  </button>
                )}
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {activeIcps.map((icp) => (
                  <label
                    key={icp.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={isIcpSelected(icp.id)}
                      onChange={() => toggleIcp(icp.id)}
                      disabled={isPending}
                      className="rounded border-input"
                    />
                    <span className="flex-1 truncate">{icp.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {icp.status}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisable}
            disabled={isPending}
          >
            {isPending ? "Disabling..." : "Disable Sharing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
