"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AskUserQuestion } from "./ask-user-question";
import { ChatInput } from "./chat-input";
import { ChatMessage, StreamingMessage } from "./chat-message";
import { ConnectionStatusBar } from "./connection-status-bar";
import { ErrorOverlay } from "./error-overlay";
import { PendingIndicator } from "./pending-indicator";
import { ToolPermissionDialog } from "./tool-permission-dialog";
import { useChatWebSocket } from "./use-chat-websocket";

interface ChatDetailProps {
  sessionId: string;
  taskId?: string;
  projectId?: string;
  backLink?: string;
  backLabel?: string;
  headerTitle?: string;
  compactHeader?: boolean;
}

export function ChatDetail({
  sessionId,
  taskId,
  projectId,
  backLink = "/chats",
  backLabel = "Back",
  headerTitle,
  compactHeader = false,
}: ChatDetailProps): React.ReactElement {
  const {
    session,
    messages,
    isLoading,
    error,
    streamingContent,
    isStreaming,
    isPending,
    pendingPermission,
    pendingQuestion,
    serverStatus,
    agentStatus,
    sessionRestoreStatus,
    memoryStats,
    sendMessage,
    handlePermissionDecision,
    handleQuestionAnswer,
    clearError,
  } = useChatWebSocket({ sessionId, taskId, projectId });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages or content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent, isPending]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {compactHeader ? (
        <div className="flex justify-end border-b px-4 py-2">
          <ConnectionStatusBar
            serverStatus={serverStatus}
            agentStatus={agentStatus}
            sessionRestoreStatus={sessionRestoreStatus}
            memoryStats={memoryStats}
          />
        </div>
      ) : (
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={backLink} className="text-sm text-muted-foreground hover:text-foreground">
                &larr; {backLabel}
              </Link>
              <h1 className="text-lg font-semibold">
                {headerTitle ?? session?.title ?? "Untitled Chat"}
              </h1>
            </div>
            <ConnectionStatusBar
              serverStatus={serverStatus}
              agentStatus={agentStatus}
              sessionRestoreStatus={sessionRestoreStatus}
              memoryStats={memoryStats}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isPending && !isStreaming && <PendingIndicator />}
          {isStreaming && streamingContent && <StreamingMessage content={streamingContent} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={isStreaming || isPending} />
        </div>
      </div>

      {pendingPermission && (
        <ToolPermissionDialog request={pendingPermission} onDecision={handlePermissionDecision} />
      )}

      {pendingQuestion && (
        <AskUserQuestion request={pendingQuestion} onAnswer={handleQuestionAnswer} />
      )}

      {error && <ErrorOverlay message={error} onDismiss={clearError} />}
    </div>
  );
}
