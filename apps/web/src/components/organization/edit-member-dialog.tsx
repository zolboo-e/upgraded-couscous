"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { useState, useTransition } from "react";
import { type OrganizationMember, updateMemberRole } from "@/lib/actions/organization";

interface EditMemberDialogProps {
  member: OrganizationMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemberDialog({
  member,
  open,
  onOpenChange,
}: EditMemberDialogProps): React.ReactElement {
  const [role, setRole] = useState<"admin" | "member">(member?.role ?? "member");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose(): void {
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();

    if (!member) return;

    startTransition(async () => {
      const result = await updateMemberRole(member.id, role);
      if (result.success) {
        handleClose();
      } else {
        setError(result.error ?? "Failed to update role");
      }
    });
  }

  // Update role when member changes
  if (member && role !== member.role && !isPending) {
    setRole(member.role);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update the role for {member?.user.name ?? member?.user.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "admin" | "member")}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
