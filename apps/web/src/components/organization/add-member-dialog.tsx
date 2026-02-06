"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { useState, useTransition } from "react";
import { addMember } from "@/lib/actions/organization";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose(): void {
    setEmail("");
    setName("");
    setRole("member");
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    startTransition(async () => {
      const result = await addMember(email.trim(), name.trim() || undefined, role);
      if (result.success) {
        handleClose();
      } else {
        setError(result.error ?? "Failed to add member");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add a new member to your organization. A new account will be created for them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
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
              {isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
