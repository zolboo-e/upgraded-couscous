"use client";

import { Button } from "@repo/ui";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { TaskStatus, TaskSummary } from "@/lib/actions/tasks";
import { CreateTaskDialog } from "./create-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import { KanbanColumn } from "./kanban-column";

const KANBAN_COLUMNS: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];

interface KanbanBoardProps {
  projectId: string;
  tasks: TaskSummary[];
}

export function KanbanBoard({ projectId, tasks }: KanbanBoardProps): React.ReactElement {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskSummary | null>(null);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskSummary[]> = {
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    return grouped;
  }, [tasks]);

  function handleTaskClick(task: TaskSummary): void {
    setEditingTask(task);
  }

  function handleDeleteRequest(): void {
    if (editingTask) {
      setDeletingTask(editingTask);
      setEditingTask(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={handleTaskClick}
          />
        ))}
      </div>

      <CreateTaskDialog
        projectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditTaskDialog
        projectId={projectId}
        task={editingTask}
        open={editingTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTask(null);
          }
        }}
        onDeleteRequest={handleDeleteRequest}
      />

      <DeleteTaskDialog
        projectId={projectId}
        task={deletingTask}
        open={deletingTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTask(null);
          }
        }}
      />
    </div>
  );
}
