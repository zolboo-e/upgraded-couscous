"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  type ChatMessage as ChatMessageType,
  type ChatSessionWithMessages,
  getChatSession,
  getWsToken,
  SANDBOX_WS_URL,
  WS_BASE_URL,
} from "@/lib/api/chat";
import type { AskUserQuestionRequest } from "./ask-user-question";
import type { AgentStatus, ServerStatus } from "./connection-status-bar";
import type { SessionRestoreStatusValue } from "./session-restore-status";
import type { MemoryStats, RawStreamChunk } from "./stream-types";
import { parseStreamChunk } from "./stream-types";
import type { ToolPermissionRequest, ToolPermissionResponse } from "./tool-permission-dialog";

interface UseChatWebSocketOptions {
  sessionId: string;
  taskId?: string;
  projectId?: string;
}

interface UseChatWebSocketResult {
  session: ChatSessionWithMessages | null;
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  isStreaming: boolean;
  isPending: boolean;
  pendingPermission: ToolPermissionRequest | null;
  pendingQuestion: AskUserQuestionRequest | null;
  serverStatus: ServerStatus;
  agentStatus: AgentStatus;
  sessionRestoreStatus: SessionRestoreStatusValue;
  memoryStats: MemoryStats | null;
  sendMessage: (content: string) => void;
  handlePermissionDecision: (response: ToolPermissionResponse) => void;
  handleQuestionAnswer: (requestId: string, answers: Record<string, string>) => void;
  clearError: () => void;
}

export function useChatWebSocket({
  sessionId,
  taskId,
  projectId,
}: UseChatWebSocketOptions): UseChatWebSocketResult {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ChatSessionWithMessages | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<ToolPermissionRequest | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<AskUserQuestionRequest | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("disconnected");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("unknown");
  const [sessionRestoreStatus, setSessionRestoreStatus] =
    useState<SessionRestoreStatusValue>("unknown");
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamingContentRef = useRef("");

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

    const handleMessage = (event: MessageEvent): void => {
      const raw: RawStreamChunk = JSON.parse(event.data as string);
      const chunk = parseStreamChunk(raw);

      switch (chunk.type) {
        case "sdk_message": {
          const sdkMsg = chunk.sdkMessage;
          if (sdkMsg?.type === "assistant" && sdkMsg.message?.content) {
            if (!streamingContentRef.current) {
              setIsStreaming(true);
              setIsPending(false);
            }
            for (const block of sdkMsg.message.content) {
              if (block.type === "text" && block.text) {
                streamingContentRef.current += block.text;
              }
            }
            setStreamingContent(streamingContentRef.current);
          }
          break;
        }

        case "stream_start":
          setIsStreaming(true);
          setIsPending(false);
          streamingContentRef.current = "";
          setStreamingContent("");
          break;

        case "chunk":
          setIsPending(false);
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
          setIsPending(false);
          break;

        case "error":
          setError(chunk.errorMessage ?? "An error occurred");
          streamingContentRef.current = "";
          setStreamingContent("");
          setIsStreaming(false);
          setIsPending(false);
          break;

        case "tool_permission_request":
          setIsPending(false);
          if (chunk.requestId && chunk.toolName && chunk.toolInput) {
            const permMsg: ChatMessageType = {
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
            setMessages((prev) => [...prev, permMsg]);
            setPendingPermission({
              requestId: chunk.requestId,
              toolName: chunk.toolName,
              toolInput: chunk.toolInput,
            });
          }
          break;

        case "ask_user_question":
          setIsPending(false);
          if (chunk.requestId && chunk.questions) {
            const qMsg: ChatMessageType = {
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
            setMessages((prev) => [...prev, qMsg]);
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

        case "agent_status":
          setIsPending(chunk.agentStatus === "pending");
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

    const connectWebSocket = async (): Promise<void> => {
      let wsUrl: string;

      if (SANDBOX_WS_URL) {
        const token = await getWsToken();
        if (!token) {
          setError("Failed to get WebSocket token");
          return;
        }
        wsUrl = `${SANDBOX_WS_URL}/ws/v2?sessionId=${sessionId}&token=${token}`;
      } else {
        wsUrl = `${WS_BASE_URL}/chat/sessions/${sessionId}/ws`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setServerStatus("connecting");

      ws.addEventListener("open", () => {
        setServerStatus("connected");
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
        setIsPending(false);
      });
      ws.addEventListener("error", () => {
        setServerStatus("disconnected");
        setIsPending(false);
      });
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setServerStatus("disconnected");
      setAgentStatus("unknown");
      setIsPending(false);
    };
  }, [sessionId, isLoading, error, session, taskId, projectId, queryClient]);

  const sendMessage = (content: string): void => {
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
    const responseMessage: ChatMessageType = {
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
    setMessages((prev) => [...prev, responseMessage]);

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
    const answerMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      type: "question_answer",
      content: JSON.stringify({ requestId, answers }),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, answerMessage]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ask_user_answer", requestId, answers }));
    }
    setPendingQuestion(null);
  };

  const clearError = (): void => {
    setError(null);
  };

  return {
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
  };
}
