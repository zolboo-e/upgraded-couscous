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
import { useState } from "react";
import { deleteTask, type TaskSummary } from "@/lib/actions/tasks";

interface DeleteTaskDialogProps {
  projectId: string;
  task: TaskSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTaskDialog({
  projectId,
  task,
  open,
  onOpenChange,
}: DeleteTaskDialogProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (!task) return;

    setIsDeleting(true);
    setServerError(null);

    const result = await deleteTask(projectId, task.id);

    if (result.success) {
      onOpenChange(false);
    } else {
      setServerError(result.error ?? "Failed to delete task");
    }

    setIsDeleting(false);
  }

  function handleClose(): void {
    setServerError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{task?.title}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
