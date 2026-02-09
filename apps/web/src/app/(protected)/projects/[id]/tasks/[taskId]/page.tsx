import { TaskChat } from "@/components/tasks/task-chat";
import { getTaskSession } from "@/lib/api/chat";

interface TaskChatPageProps {
  params: Promise<{ id: string; taskId: string }>;
}

export default async function TaskChatPage({
  params,
}: TaskChatPageProps): Promise<React.ReactElement> {
  const { id, taskId } = await params;

  let sessionId: string | null = null;
  try {
    const session = await getTaskSession(taskId);
    sessionId = session.id;
  } catch {
    // Session may not exist yet
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No chat session available for this task.
      </div>
    );
  }

  return <TaskChat sessionId={sessionId} projectId={id} taskId={taskId} />;
}
