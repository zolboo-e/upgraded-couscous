"use client";

import { Button } from "@repo/ui";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { TaskStatus, TaskSummary } from "@/lib/actions/tasks";
import { CreateTaskDialog } from "./create-task-dialog";
import { KanbanColumn } from "./kanban-column";

const KANBAN_COLUMNS: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];

interface KanbanBoardProps {
  projectId: string;
  tasks: TaskSummary[];
}

export function KanbanBoard({ projectId, tasks }: KanbanBoardProps): React.ReactElement {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const tasksByStatus: Record<TaskStatus, TaskSummary[]> = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
    cancelled: tasks.filter((t) => t.status === "cancelled"),
  };

  const handleTaskClick = useCallback(
    (task: TaskSummary): void => {
      router.push(`/projects/${projectId}/tasks/${task.id}`);
    },
    [router, projectId],
  );

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
    </div>
  );
}
