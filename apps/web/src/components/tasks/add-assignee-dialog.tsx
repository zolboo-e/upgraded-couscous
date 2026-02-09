"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { useState } from "react";
import type { ProjectMember } from "@/lib/actions/projects";
import { addTaskAssignee } from "@/lib/actions/task-assignees";

interface AddAssigneeDialogProps {
  projectId: string;
  taskId: string;
  availableMembers: ProjectMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAssigneeDialog({
  projectId,
  taskId,
  availableMembers,
  open,
  onOpenChange,
}: AddAssigneeDialogProps): React.ReactElement {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleAdd(): Promise<void> {
    if (!selectedUserId) return;

    setIsAdding(true);
    setServerError(null);

    const result = await addTaskAssignee(projectId, taskId, selectedUserId);

    if (result.success) {
      setSelectedUserId("");
      onOpenChange(false);
    } else {
      setServerError(result.error ?? "Failed to add assignee");
    }

    setIsAdding(false);
  }

  function handleClose(): void {
    setSelectedUserId("");
    setServerError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Assignee</DialogTitle>
          <DialogDescription>Select a project member to assign to this task.</DialogDescription>
        </DialogHeader>

        {availableMembers.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            All project members are already assigned.
          </p>
        ) : (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              {availableMembers.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.user.name ?? member.user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding || !selectedUserId}>
            {isAdding ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
