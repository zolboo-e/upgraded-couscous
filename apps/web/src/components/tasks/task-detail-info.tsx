"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ProjectMember } from "@/lib/actions/projects";
import type { TaskAssignee } from "@/lib/actions/task-assignees";
import {
  type TaskPriority,
  type TaskStatus,
  type TaskSummary,
  updateTask,
} from "@/lib/actions/tasks";
import { updateTaskSchema } from "@/lib/validations/task";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskAssigneesSection } from "./task-assignees-section";

interface TaskDetailInfoProps {
  task: TaskSummary;
  projectId: string;
  assignees: TaskAssignee[];
  projectMembers: ProjectMember[];
}

export function TaskDetailInfo({
  task,
  projectId,
  assignees,
  projectMembers,
}: TaskDetailInfoProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      details: task.details ?? "",
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await updateTask(projectId, task.id, {
        title: value.title.trim(),
        description: value.description.trim() || null,
        details: value.details.trim() || null,
        status: value.status,
        priority: value.priority,
        dueDate: value.dueDate || null,
      });
      if (!result.success) {
        setServerError(result.error ?? "Failed to update task");
      }
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="grid gap-4">
              <form.Field name="title" validators={{ onChange: updateTaskSchema.shape.title }}>
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Title</Label>
                    <Input
                      id={field.name}
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
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      rows={4}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]?.toString()}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="details">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Details</Label>
                    <Textarea
                      id={field.name}
                      placeholder="Detailed notes (supports markdown)..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      rows={8}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="status">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Status</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as TaskStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                      onValueChange={(v) => field.handleChange(v as TaskPriority)}
                    >
                      <SelectTrigger>
                        <SelectValue />
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

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                      <Save className="mr-1 h-4 w-4" />
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <TaskAssigneesSection
        projectId={projectId}
        taskId={task.id}
        assignees={assignees}
        projectMembers={projectMembers}
      />

      <DeleteTaskDialog
        projectId={projectId}
        task={task}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
