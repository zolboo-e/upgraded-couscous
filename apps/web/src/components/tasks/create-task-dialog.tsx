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
import { useState } from "react";
import { createTask, type TaskPriority } from "@/lib/actions/tasks";
import { createTaskSchema } from "@/lib/validations/task";

interface CreateTaskDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({
  projectId,
  open,
  onOpenChange,
}: CreateTaskDialogProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      priority: "medium" as TaskPriority,
      dueDate: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await createTask(projectId, {
        title: value.title.trim(),
        description: value.description.trim() || undefined,
        priority: value.priority,
        dueDate: value.dueDate || undefined,
      });
      if (result.success) {
        form.reset();
        setServerError(null);
        onOpenChange(false);
      } else {
        setServerError(result.error ?? "Failed to create task");
      }
    },
  });

  function handleClose(): void {
    form.reset();
    setServerError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task to this project.</DialogDescription>
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
                onChange: createTaskSchema.shape.title,
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
                  <Label htmlFor={field.name}>Description (optional)</Label>
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
                  <Label htmlFor={field.name}>Due Date (optional)</Label>
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

          <DialogFooter>
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
                    {isSubmitting ? "Creating..." : "Create Task"}
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
