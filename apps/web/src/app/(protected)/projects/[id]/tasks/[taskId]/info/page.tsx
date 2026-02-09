import { notFound } from "next/navigation";
import { TaskDetailInfo } from "@/components/tasks/task-detail-info";
import { getProjectMembers } from "@/lib/actions/projects";
import { getTaskAssignees } from "@/lib/actions/task-assignees";
import { getTask } from "@/lib/actions/tasks";

interface TaskInfoPageProps {
  params: Promise<{ id: string; taskId: string }>;
}

export default async function TaskInfoPage({
  params,
}: TaskInfoPageProps): Promise<React.ReactElement> {
  const { id, taskId } = await params;

  const [task, assigneesResult, members] = await Promise.all([
    getTask(id, taskId),
    getTaskAssignees(id, taskId),
    getProjectMembers(id),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <TaskDetailInfo
      task={task}
      projectId={id}
      assignees={assigneesResult?.assignees ?? []}
      projectMembers={members?.members ?? []}
    />
  );
}
