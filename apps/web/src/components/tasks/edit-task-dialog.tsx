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
  Textarea,
} from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type TaskPriority,
  type TaskStatus,
  type TaskSummary,
  updateTask,
} from "@/lib/actions/tasks";
import { updateTaskSchema } from "@/lib/validations/task";

interface EditTaskDialogProps {
  projectId: string;
  task: TaskSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteRequest: () => void;
}

export function EditTaskDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onDeleteRequest,
}: EditTaskDialogProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: (task?.status ?? "todo") as TaskStatus,
      priority: (task?.priority ?? "medium") as TaskPriority,
      dueDate: task?.dueDate ? task.dueDate.split("T")[0] : "",
    },
    onSubmit: async ({ value }) => {
      if (!task) return;

      setServerError(null);
      const result = await updateTask(projectId, task.id, {
        title: value.title.trim(),
        description: value.description.trim() || null,
        status: value.status,
        priority: value.priority,
        dueDate: value.dueDate || null,
      });
      if (result.success) {
        setServerError(null);
        onOpenChange(false);
      } else {
        setServerError(result.error ?? "Failed to update task");
      }
    },
  });

  useEffect(() => {
    if (task) {
      form.reset();
      form.setFieldValue("title", task.title);
      form.setFieldValue("description", task.description ?? "");
      form.setFieldValue("status", task.status);
      form.setFieldValue("priority", task.priority);
      form.setFieldValue("dueDate", task.dueDate ? task.dueDate.split("T")[0] : "");
    }
  }, [task, form]);

  function handleClose(): void {
    setServerError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update the task details.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 py-4">
            <form.Field
              name="title"
              validators={{
                onChange: updateTaskSchema.shape.title,
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Title</Label>
                  <Input
                    id={field.name}
                    placeholder="Task title"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors[0]?.toString()}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="description"
              validators={{
                onChange: ({ value }) =>
                  value.length > 2000 ? "Description must be at most 2000 characters" : undefined,
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Description</Label>
                  <Textarea
                    id={field.name}
                    placeholder="Task description..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    rows={3}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors[0]?.toString()}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as TaskStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="priority">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Priority</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as TaskPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="dueDate">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Due Date</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              onClick={onDeleteRequest}
              className="mr-auto"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
