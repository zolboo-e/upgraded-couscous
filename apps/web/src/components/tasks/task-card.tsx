"use client";

import { Card, CardContent, CardHeader } from "@repo/ui";
import { Calendar } from "lucide-react";
import type { TaskSummary } from "@/lib/actions/tasks";
import { TaskPriorityBadge } from "./task-priority-badge";

interface TaskCardProps {
  task: TaskSummary;
  onClick: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskCard({ task, onClick }: TaskCardProps): React.ReactElement {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {task.description && (
          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
