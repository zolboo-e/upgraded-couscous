"use client";

import type { TaskSummary } from "@/lib/actions/tasks";
import { useTask } from "@/lib/queries/task";
import { TaskPriorityBadge } from "./task-priority-badge";

interface TaskHeaderProps {
  task: TaskSummary;
  projectId: string;
}

export function TaskHeader({ task: initialTask, projectId }: TaskHeaderProps): React.ReactElement {
  const task = useTask(projectId, initialTask.id, initialTask);

  return (
    <>
      <span className="font-semibold">{task.title}</span>
      <TaskPriorityBadge priority={task.priority} />
    </>
  );
}
