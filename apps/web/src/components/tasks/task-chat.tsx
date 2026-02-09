"use client";

import { ChatDetail } from "@/components/chat/chat-detail";

interface TaskChatProps {
  sessionId: string;
  projectId: string;
  taskId: string;
}

export function TaskChat({ sessionId, projectId, taskId }: TaskChatProps): React.ReactElement {
  return (
    <ChatDetail
      sessionId={sessionId}
      taskId={taskId}
      projectId={projectId}
      backLink={`/projects/${projectId}/tasks/${taskId}`}
      backLabel="Back to Task"
      headerTitle="Task Chat"
      compactHeader
    />
  );
}
