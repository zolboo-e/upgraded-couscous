import type { Message, QuestionContent, Session } from "@repo/db";
import type { WSContext } from "hono/ws";
import { env } from "../config/env.js";
import {
  SandboxNotConfiguredError,
  type SandboxOutMessage,
  SandboxWebSocketClient,
} from "../sandbox/index.js";
import type { ChatService } from "./services/chat.service.js";
import type { StreamChunk, WebSocketMessage } from "./types/chat.types.js";
import { logWsIncoming, logWsOutgoing } from "./utils/ws-logger.js";

interface PendingPermission {
  toolName: string;
  toolInput: Record<string, unknown>;
}

interface PendingQuestion {
  questions: QuestionContent["questions"];
}

interface WebSocketState {
  sandboxClient: SandboxWebSocketClient | null;
  sessionId: string;
  userId: string;
  assistantContent: string;
  isProcessing: boolean;
  toolsUsed: string[];
  pendingPermissions: Map<string, PendingPermission>;
  pendingQuestions: Map<string, PendingQuestion>;
}

function sendChunk(ws: WSContext, sessionId: string, chunk: StreamChunk): void {
  logWsOutgoing(sessionId, chunk);
  ws.send(JSON.stringify(chunk));
}

export function createWebSocketHandler(chatService: ChatService) {
  return {
    onOpen: async (
      ws: WSContext,
      session: Session,
      _history: Message[],
      userId: string,
    ): Promise<WebSocketState> => {
      const state: WebSocketState = {
        sandboxClient: null,
        sessionId: session.id,
        userId,
        assistantContent: "",
        isProcessing: false,
        toolsUsed: [],
        pendingPermissions: new Map(),
        pendingQuestions: new Map(),
      };

      // Check if sandbox is configured
      if (!env.SANDBOX_WS_URL || !env.SANDBOX_API_TOKEN) {
        sendChunk(ws, session.id, {
          type: "connection_status",
          sandboxStatus: "not_configured",
        });
        sendChunk(ws, session.id, {
          type: "error",
          message: "Sandbox is not configured. Set SANDBOX_WS_URL and SANDBOX_API_TOKEN.",
        });
        throw new SandboxNotConfiguredError();
      }

      try {
        // Create and connect to sandbox
        // sessionId is used for Cloudflare sandbox instance, S3 prefix, and Claude session ID
        state.sandboxClient = new SandboxWebSocketClient({
          url: env.SANDBOX_WS_URL,
          token: env.SANDBOX_API_TOKEN,
          sessionId: session.id,
        });

        // Set up message handler before connecting
        state.sandboxClient.onMessage((message) => {
          handleSandboxMessage(ws, state, message, chatService);
        });

        state.sandboxClient.onError((error) => {
          sendChunk(ws, state.sessionId, { type: "error", message: error.message });
        });

        state.sandboxClient.onClose(() => {
          state.sandboxClient = null;
          sendChunk(ws, state.sessionId, {
            type: "connection_status",
            sandboxStatus: "disconnected",
          });
        });

        await state.sandboxClient.connect();

        // Notify frontend that sandbox is connected
        sendChunk(ws, session.id, {
          type: "connection_status",
          sandboxStatus: "connected",
        });

        // Send start message to sandbox (API key set via setEnvVars in sandbox worker)
        state.sandboxClient.send({
          type: "start",
          systemPrompt: session.systemPrompt ?? undefined,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to connect to sandbox";
        sendChunk(ws, session.id, {
          type: "connection_status",
          sandboxStatus: "disconnected",
        });
        sendChunk(ws, session.id, { type: "error", message: errorMessage });
        throw error;
      }

      return state;
    },

    onMessage: async (
      ws: WSContext,
      state: WebSocketState,
      chatService: ChatService,
      data: string,
    ): Promise<void> => {
      try {
        const message = JSON.parse(data) as WebSocketMessage;
        logWsIncoming(state.sessionId, message);

        if (message.type === "message" && message.content) {
          // Save user message to database
          await chatService.saveUserMessage(state.sessionId, message.content);

          // Forward to sandbox
          if (state.sandboxClient?.isConnected()) {
            state.sandboxClient.send({
              type: "message",
              content: message.content,
            });
          }

          state.assistantContent = "";
          state.isProcessing = true;
        } else if (message.type === "interrupt") {
          // Forward interrupt to sandbox
          if (state.sandboxClient?.isConnected()) {
            state.sandboxClient.send({ type: "interrupt" });
          }
        } else if (message.type === "permission_response" && message.requestId) {
          // Get pending permission request
          const pendingRequest = state.pendingPermissions.get(message.requestId);
          if (pendingRequest) {
            // Save both request and response to database
            await chatService.savePermissionExchange(
              state.sessionId,
              {
                requestId: message.requestId,
                toolName: pendingRequest.toolName,
                toolInput: pendingRequest.toolInput,
              },
              {
                requestId: message.requestId,
                decision: message.decision ?? "deny",
                modifiedInput: message.modifiedInput,
              },
            );
            state.pendingPermissions.delete(message.requestId);
          }

          // Forward permission response to sandbox
          if (state.sandboxClient?.isConnected()) {
            state.sandboxClient.send({
              type: "permission_response",
              requestId: message.requestId,
              decision: message.decision ?? "deny",
              modifiedInput: message.modifiedInput,
              message: message.message,
            });
          }
        } else if (message.type === "ask_user_answer" && message.requestId) {
          // Get pending question
          const pendingQuestion = state.pendingQuestions.get(message.requestId);
          if (pendingQuestion) {
            // Save both question and answer to database
            await chatService.saveQuestionExchange(
              state.sessionId,
              {
                requestId: message.requestId,
                questions: pendingQuestion.questions,
              },
              {
                requestId: message.requestId,
                answers: message.answers ?? {},
              },
            );
            state.pendingQuestions.delete(message.requestId);
          }

          // Forward answer to sandbox
          if (state.sandboxClient?.isConnected()) {
            state.sandboxClient.send({
              type: "ask_user_answer",
              requestId: message.requestId,
              answers: message.answers ?? {},
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Invalid message format";
        sendChunk(ws, state.sessionId, { type: "error", message: errorMessage });
      }
    },

    onClose: (state: WebSocketState): void => {
      if (state.sandboxClient?.isConnected()) {
        state.sandboxClient.send({ type: "close" });
        state.sandboxClient.close();
      }
    },
  };
}

async function handleSandboxMessage(
  ws: WSContext,
  state: WebSocketState,
  message: SandboxOutMessage,
  chatService: ChatService,
): Promise<void> {
  switch (message.type) {
    case "stream_start":
      sendChunk(ws, state.sessionId, { type: "stream_start" });
      break;

    case "chunk":
      state.assistantContent += message.content;
      sendChunk(ws, state.sessionId, { type: "chunk", content: message.content });
      break;

    case "stream_end":
      sendChunk(ws, state.sessionId, { type: "stream_end" });
      break;

    case "done": {
      // Save complete assistant message
      if (state.assistantContent) {
        const savedMessage = await chatService.saveAssistantMessage(
          state.sessionId,
          state.assistantContent,
          message.metadata,
        );

        sendChunk(ws, state.sessionId, {
          type: "done",
          messageId: savedMessage.id,
          metadata: message.metadata,
        });
      } else {
        sendChunk(ws, state.sessionId, {
          type: "done",
          metadata: message.metadata,
        });
      }

      state.assistantContent = "";
      state.isProcessing = false;
      break;
    }

    case "error":
      sendChunk(ws, state.sessionId, { type: "error", message: message.message });
      break;

    case "tool_permission_request": {
      // Track tool usage
      if (!state.toolsUsed.includes(message.toolName)) {
        state.toolsUsed.push(message.toolName);
      }

      // Store pending permission for later persistence
      state.pendingPermissions.set(message.requestId, {
        toolName: message.toolName,
        toolInput: message.toolInput,
      });

      // Forward permission request to user
      sendChunk(ws, state.sessionId, {
        type: "tool_permission_request",
        requestId: message.requestId,
        toolName: message.toolName,
        toolInput: message.toolInput,
      });
      break;
    }

    case "ask_user_question": {
      // Store pending question for later persistence
      state.pendingQuestions.set(message.requestId, {
        questions: message.questions,
      });

      // Forward question to user
      sendChunk(ws, state.sessionId, {
        type: "ask_user_question",
        requestId: message.requestId,
        questions: message.questions,
      });
      break;
    }
  }
}

export type WebSocketHandler = ReturnType<typeof createWebSocketHandler>;
