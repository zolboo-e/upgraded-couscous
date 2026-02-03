"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
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
import {
  ToolPermissionDialog,
  type ToolPermissionRequest,
  type ToolPermissionResponse,
} from "./tool-permission-dialog";

interface StreamChunk {
  type:
    | "stream_start"
    | "chunk"
    | "stream_end"
    | "done"
    | "error"
    | "tool_permission_request"
    | "ask_user_question"
    | "connection_status";
  content?: string;
  messageId?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    stopReason?: string;
  };
  message?: string;
  // Permission request fields
  requestId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  // Ask user question fields
  questions?: QuestionItem[];
  // Connection status fields
  sandboxStatus?: "connected" | "disconnected" | "connecting" | "not_configured";
}

interface ChatDetailProps {
  sessionId: string;
}

export function ChatDetail({ sessionId }: ChatDetailProps): React.ReactElement {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

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

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages or content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isAuthenticated) {
      return;
    }

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
  }, [sessionId, isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading || error) {
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
            systemPrompt: session?.systemPrompt,
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
      const chunk: StreamChunk = JSON.parse(event.data as string);

      switch (chunk.type) {
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
          break;

        case "error":
          setError(chunk.message ?? "An error occurred");
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
  }, [sessionId, isAuthenticated, isLoading, error, session]);

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

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
        <Link href="/chats" className="text-sm text-primary hover:underline">
          Back to chats
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chats" className="text-sm text-muted-foreground hover:text-foreground">
              &larr; Back
            </Link>
            <h1 className="text-lg font-semibold">{session?.title ?? "Untitled Chat"}</h1>
          </div>
          <ConnectionStatusBar serverStatus={serverStatus} agentStatus={agentStatus} />
        </div>
      </div>

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
    </div>
  );
}
