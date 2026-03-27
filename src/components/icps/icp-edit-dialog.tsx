"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateIcp } from "@/actions/icps";
import { duplicateIcpForProduct } from "@/actions/product-icps";
import type { ActionResult } from "@/lib/types";
import { Pencil, AlertTriangle, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

type IcpEditDialogProps = {
  icp: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    parentIcpId?: string | null;
  };
  productCount?: number;
  currentProductId?: string;
};

export function IcpEditDialog({ icp, productCount = 1, currentProductId }: IcpEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [status, setStatus] = useState(icp.status);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const isShared = productCount > 1;

  function handleEditClick() {
    if (isShared) {
      setShowWarning(true);
      setOpen(true);
    } else {
      setShowWarning(false);
      setOpen(true);
    }
  }

  function handleEditShared() {
    setShowWarning(false);
  }

  async function handleDuplicate() {
    if (!currentProductId) return;
    setIsDuplicating(true);
    const result = await duplicateIcpForProduct(icp.id, currentProductId);
    setIsDuplicating(false);
    setOpen(false);
    if (result.success && result.newIcpId) {
      router.push(`/icps/${result.newIcpId}`);
    }
  }

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(async (_prev, formData) => {
    const result = await updateIcp(icp.id, formData);
    if (result.success) {
      setOpen(false);
    }
    return result;
  }, null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleEditClick}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {/* Warning for shared ICPs */}
          {showWarning ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Shared ICP
                </DialogTitle>
                <DialogDescription>
                  This ICP is used in {productCount} products. Changes will apply everywhere.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Button className="w-full justify-start" variant="outline" onClick={handleEditShared}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit shared ICP
                </Button>
                {currentProductId && (
                  <Button className="w-full justify-start" variant="outline" onClick={handleDuplicate} disabled={isDuplicating}>
                    <Copy className="mr-2 h-4 w-4" />
                    {isDuplicating ? "Duplicating..." : "Duplicate for this product instead"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Edit ICP</DialogTitle>
                <DialogDescription>
                  Update name, description, or status.
                  {isShared && <span className="text-amber-600"> Changes apply to all {productCount} products.</span>}
                </DialogDescription>
              </DialogHeader>
              <form action={formAction} className="space-y-4">
                {state?.error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {state.error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" name="name" defaultValue={icp.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea id="edit-description" name="description" defaultValue={icp.description ?? ""} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <input type="hidden" name="status" value={status} />
                  <Select value={status} onValueChange={(val) => { if (val) setStatus(val); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft" label="Draft">Draft</SelectItem>
                      <SelectItem value="active" label="Active">Active</SelectItem>
                      <SelectItem value="archived" label="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
