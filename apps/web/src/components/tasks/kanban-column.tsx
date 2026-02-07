import { Badge } from "@repo/ui";
import { CheckCircle, Circle, Clock, type LucideIcon, XCircle } from "lucide-react";
import type { TaskStatus, TaskSummary } from "@/lib/actions/tasks";
import { TaskCard } from "./task-card";

const columnConfig: Record<TaskStatus, { title: string; icon: LucideIcon }> = {
  todo: { title: "To Do", icon: Circle },
  in_progress: { title: "In Progress", icon: Clock },
  done: { title: "Done", icon: CheckCircle },
  cancelled: { title: "Cancelled", icon: XCircle },
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskSummary[];
  onTaskClick: (task: TaskSummary) => void;
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
}: KanbanColumnProps): React.ReactElement {
  const config = columnConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex min-w-64 flex-col rounded-lg bg-muted/50 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{config.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {tasks.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No tasks</p>
        )}
      </div>
    </div>
  );
}
