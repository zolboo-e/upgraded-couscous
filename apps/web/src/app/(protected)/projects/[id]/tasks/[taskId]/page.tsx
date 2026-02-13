import { notFound } from "next/navigation";
import { TaskChat } from "@/components/tasks/task-chat";
import { TaskDetailInfo } from "@/components/tasks/task-detail-info";
import { TaskSplitLayout } from "@/components/tasks/task-split-layout";
import { getProjectById, getProjectMembers } from "@/lib/actions/projects";
import { getTaskAssignees } from "@/lib/actions/task-assignees";
import { getTask } from "@/lib/actions/tasks";
import { getTaskSession } from "@/lib/api/chat";

interface TaskDetailPageProps {
  params: Promise<{ id: string; taskId: string }>;
}

export default async function TaskDetailPage({
  params,
}: TaskDetailPageProps): Promise<React.ReactElement> {
  const { id, taskId } = await params;

  const [task, assigneesResult, members, project] = await Promise.all([
    getTask(id, taskId),
    getTaskAssignees(id, taskId),
    getProjectMembers(id),
    getProjectById(id),
  ]);

  if (!task) {
    notFound();
  }

  let sessionId: string | null = null;
  try {
    const session = await getTaskSession(taskId);
    sessionId = session.id;
  } catch {
    // Session may not exist yet
  }

  const chatPanel = sessionId ? (
    <TaskChat sessionId={sessionId} projectId={id} taskId={taskId} />
  ) : (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      No chat session available for this task.
    </div>
  );

  const hasRepoConfigured = Boolean(project?.meta?.repoUrl && project?.meta?.hasGithubToken);

  const infoPanel = (
    <TaskDetailInfo
      task={task}
      projectId={id}
      assignees={assigneesResult?.assignees ?? []}
      projectMembers={members?.members ?? []}
      hasRepoConfigured={hasRepoConfigured}
    />
  );

  return <TaskSplitLayout chatPanel={chatPanel} infoPanel={infoPanel} />;
}
