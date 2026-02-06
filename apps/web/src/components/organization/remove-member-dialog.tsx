"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui";
import { useState, useTransition } from "react";
import { type OrganizationMember, removeMember } from "@/lib/actions/organization";

interface RemoveMemberDialogProps {
  member: OrganizationMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoveMemberDialog({
  member,
  open,
  onOpenChange,
}: RemoveMemberDialogProps): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose(): void {
    setError(null);
    onOpenChange(false);
  }

  function handleRemove(): void {
    if (!member) return;

    startTransition(async () => {
      const result = await removeMember(member.id);
      if (result.success) {
        handleClose();
      } else {
        setError(result.error ?? "Failed to remove member");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-medium">{member?.user.name ?? member?.user.email}</span> from the
            organization? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
            {isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
