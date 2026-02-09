"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  type ChatMessage as ChatMessageType,
  type ChatSessionWithMessages,
  getChatSession,
  getWsToken,
  SANDBOX_WS_URL,
  WS_BASE_URL,
} from "@/lib/api/chat";
import {
  AskUserQuestion,
  type AskUserQuestionRequest,
  type QuestionItem,
} from "./ask-user-question";
import { ChatInput } from "./chat-input";
import { ChatMessage, StreamingMessage } from "./chat-message";
import { type AgentStatus, ConnectionStatusBar, type ServerStatus } from "./connection-status-bar";
import { ErrorOverlay } from "./error-overlay";
import type { SessionRestoreStatusValue } from "./session-restore-status";
import {
  ToolPermissionDialog,
  type ToolPermissionRequest,
  type ToolPermissionResponse,
} from "./tool-permission-dialog";

/**
 * Content block types from Claude Agent SDK
 */
interface SDKContentBlock {
  type: "text" | "tool_use" | "thinking" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  thinking?: string;
  tool_use_id?: string;
  content?: string;
}

/**
 * Raw SDK message structure
 */
interface SDKMessagePayload {
  type: "assistant" | "user" | "result";
  message?: {
    content?: SDKContentBlock[];
  };
  subtype?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Memory stats from container
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

/**
 * Raw WebSocket chunk from server - uses 'message' for both SDK payloads and error strings
 */
interface RawStreamChunk {
  type: string;
  content?: string;
  messageId?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    stopReason?: string;
  };
  message?: SDKMessagePayload | string;
  requestId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  questions?: QuestionItem[];
  sandboxStatus?: "connected" | "disconnected" | "connecting" | "not_configured";
  // Session status field
  status?: SessionRestoreStatusValue;
  // Memory stats fields
  heapUsed?: number;
  heapTotal?: number;
  rss?: number;
  external?: number;
  // Task update fields
  title?: string;
  description?: string | null;
}

/**
 * Normalized stream chunk with typed message fields
 */
interface StreamChunk {
  type:
    | "stream_start"
    | "chunk"
    | "stream_end"
    | "done"
    | "error"
    | "tool_permission_request"
    | "ask_user_question"
    | "connection_status"
    | "sdk_message"
    | "session_status"
    | "memory_stats"
    | "task_updated";
  content?: string;
  messageId?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    stopReason?: string;
  };
  // Raw SDK message (for sdk_message type)
  sdkMessage?: SDKMessagePayload;
  // Error message string (for error type)
  errorMessage?: string;
  // Permission request fields
  requestId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  // Ask user question fields
  questions?: QuestionItem[];
  // Connection status fields
  sandboxStatus?: "connected" | "disconnected" | "connecting" | "not_configured";
  // Session restore status
  sessionStatus?: SessionRestoreStatusValue;
  // Memory stats
  memoryStats?: MemoryStats;
  // Task update data
  taskUpdate?: { title?: string; description?: string | null };
}

function parseStreamChunk(raw: RawStreamChunk): StreamChunk {
  const chunk: StreamChunk = {
    type: raw.type as StreamChunk["type"],
    content: raw.content,
    messageId: raw.messageId,
    metadata: raw.metadata,
    requestId: raw.requestId,
    toolName: raw.toolName,
    toolInput: raw.toolInput,
    questions: raw.questions,
    sandboxStatus: raw.sandboxStatus,
  };

  // Type-specific message field mapping
  if (raw.type === "sdk_message" && raw.message && typeof raw.message !== "string") {
    chunk.sdkMessage = raw.message;
  } else if (raw.type === "error" && typeof raw.message === "string") {
    chunk.errorMessage = raw.message;
  } else if (raw.type === "session_status" && raw.status) {
    chunk.sessionStatus = raw.status;
  } else if (raw.type === "memory_stats" && raw.heapUsed !== undefined) {
    chunk.memoryStats = {
      heapUsed: raw.heapUsed,
      heapTotal: raw.heapTotal ?? 0,
      rss: raw.rss ?? 0,
      external: raw.external ?? 0,
    };
  } else if (raw.type === "task_updated") {
    chunk.taskUpdate = { title: raw.title, description: raw.description };
  }

  return chunk;
}

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
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ChatSessionWithMessages | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<ToolPermissionRequest | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<AskUserQuestionRequest | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("disconnected");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("unknown");
  const [sessionRestoreStatus, setSessionRestoreStatus] =
    useState<SessionRestoreStatusValue>("unknown");
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages or content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  useEffect(() => {
    const fetchSession = async (): Promise<void> => {
      try {
        const data = await getChatSession(sessionId);
        setSession(data);
        setMessages(data.messages);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    if (isLoading || error) {
      return;
    }

    const connectWebSocket = async (): Promise<void> => {
      let wsUrl: string;

      // Use sandbox direct connection if configured
      if (SANDBOX_WS_URL) {
        const token = await getWsToken();
        if (!token) {
          setError("Failed to get WebSocket token");
          return;
        }
        wsUrl = `${SANDBOX_WS_URL}/ws/v2?sessionId=${sessionId}&token=${token}`;
      } else {
        // Fallback to API WebSocket
        wsUrl = `${WS_BASE_URL}/chat/sessions/${sessionId}/ws`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setServerStatus("connecting");

      ws.addEventListener("open", () => {
        setServerStatus("connected");
        // Initialize container with session info
        ws.send(
          JSON.stringify({
            type: "start",
            sessionId,
            ...(session?.systemPrompt && { systemPrompt: session.systemPrompt }),
            ...(taskId && { taskId }),
            ...(projectId && { projectId }),
          }),
        );
      });

      ws.addEventListener("message", handleMessage);

      ws.addEventListener("close", () => {
        setServerStatus("disconnected");
      });

      ws.addEventListener("error", () => {
        setServerStatus("disconnected");
      });
    };

    const handleMessage = (event: MessageEvent): void => {
      const raw: RawStreamChunk = JSON.parse(event.data as string);
      const chunk = parseStreamChunk(raw);

      switch (chunk.type) {
        case "sdk_message": {
          // Handle raw SDK messages for real-time display
          const sdkMsg = chunk.sdkMessage;
          if (sdkMsg?.type === "assistant" && sdkMsg.message?.content) {
            // Start streaming on first assistant message
            if (!streamingContentRef.current) {
              setIsStreaming(true);
            }

            // Extract text content for display
            for (const block of sdkMsg.message.content) {
              if (block.type === "text" && block.text) {
                streamingContentRef.current += block.text;
              }
              // TODO: Handle tool_use and thinking blocks for UI display
            }
            setStreamingContent(streamingContentRef.current);
          }
          break;
        }

        case "stream_start":
          setIsStreaming(true);
          streamingContentRef.current = "";
          setStreamingContent("");
          break;

        case "chunk":
          streamingContentRef.current += chunk.content ?? "";
          setStreamingContent(streamingContentRef.current);
          break;

        case "stream_end":
          setIsStreaming(false);
          break;

        case "done":
          if (chunk.messageId) {
            const newMessage: ChatMessageType = {
              id: chunk.messageId,
              sessionId,
              role: "assistant",
              content: streamingContentRef.current,
              metadata: chunk.metadata,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, newMessage]);
          }
          streamingContentRef.current = "";
          setStreamingContent("");
          setIsStreaming(false);
          break;

        case "error":
          setError(chunk.errorMessage ?? "An error occurred");
          streamingContentRef.current = "";
          setStreamingContent("");
          setIsStreaming(false);
          break;

        case "tool_permission_request":
          if (chunk.requestId && chunk.toolName && chunk.toolInput) {
            const permissionRequestMessage: ChatMessageType = {
              id: crypto.randomUUID(),
              sessionId,
              role: "assistant",
              type: "permission_request",
              content: JSON.stringify({
                requestId: chunk.requestId,
                toolName: chunk.toolName,
                toolInput: chunk.toolInput,
              }),
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, permissionRequestMessage]);
            setPendingPermission({
              requestId: chunk.requestId,
              toolName: chunk.toolName,
              toolInput: chunk.toolInput,
            });
          }
          break;

        case "ask_user_question":
          if (chunk.requestId && chunk.questions) {
            const questionMessage: ChatMessageType = {
              id: crypto.randomUUID(),
              sessionId,
              role: "assistant",
              type: "question",
              content: JSON.stringify({
                requestId: chunk.requestId,
                questions: chunk.questions,
              }),
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, questionMessage]);
            setPendingQuestion({
              requestId: chunk.requestId,
              questions: chunk.questions,
            });
          }
          break;

        case "connection_status":
          if (chunk.sandboxStatus) {
            setAgentStatus(chunk.sandboxStatus);
          }
          break;

        case "session_status":
          if (chunk.sessionStatus) {
            setSessionRestoreStatus(chunk.sessionStatus);
          }
          break;

        case "memory_stats":
          if (chunk.memoryStats) {
            setMemoryStats(chunk.memoryStats);
          }
          break;

        case "task_updated":
          if (chunk.taskUpdate && projectId && taskId) {
            queryClient.setQueryData(
              ["task", projectId, taskId],
              (old: Record<string, unknown> | undefined) =>
                old ? { ...old, ...chunk.taskUpdate } : old,
            );
          }
          break;
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setServerStatus("disconnected");
      setAgentStatus("unknown");
    };
  }, [sessionId, isLoading, error, session, taskId, projectId, queryClient]);

  const handleSendMessage = (content: string): void => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("Not connected to chat server");
      return;
    }

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    wsRef.current.send(JSON.stringify({ type: "message", content }));
  };

  const handlePermissionDecision = (response: ToolPermissionResponse): void => {
    // Add permission response message to chat history
    const permissionResponseMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      type: "permission_response",
      content: JSON.stringify({
        requestId: response.requestId,
        decision: response.decision,
        modifiedInput: response.modifiedInput,
      }),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, permissionResponseMessage]);

    // Send response to backend
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "permission_response",
          requestId: response.requestId,
          decision: response.decision,
          modifiedInput: response.modifiedInput,
          message: response.message,
        }),
      );
    }
    setPendingPermission(null);
  };

  const handleQuestionAnswer = (requestId: string, answers: Record<string, string>): void => {
    // Add question answer message to chat history
    const questionAnswerMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      type: "question_answer",
      content: JSON.stringify({
        requestId,
        answers,
      }),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, questionAnswerMessage]);

    // Send answer to backend
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "ask_user_answer",
          requestId,
          answers,
        }),
      );
    }
    setPendingQuestion(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const clearError = (): void => {
    setError(null);
  };

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
          {isStreaming && streamingContent && <StreamingMessage content={streamingContent} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
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
