import { ArrowLeft, CheckSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskHeader } from "@/components/tasks/task-header";
import { TaskTabNavigation } from "@/components/tasks/task-tab-navigation";
import { getTask } from "@/lib/actions/tasks";

interface TaskDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; taskId: string }>;
}

export default async function TaskDetailLayout({
  children,
  params,
}: TaskDetailLayoutProps): Promise<React.ReactElement> {
  const { id, taskId } = await params;

  const task = await getTask(id, taskId);
  if (!task) {
    notFound();
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 pb-4">
        <Link
          href={`/projects/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Link>
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <TaskHeader task={task} projectId={id} />
        </div>
        <TaskTabNavigation projectId={id} taskId={taskId} />
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
