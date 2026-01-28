import type { Message, QuestionContent, Session } from "@repo/db";
import type { WSContext } from "hono/ws";
import { env } from "../config/env.js";
import type { ChatService } from "./services/chat.service.js";
import { ClaudeService, type MessageQueue } from "./services/claude.service.js";
import { PermissionService } from "./services/permission.service.js";
import type { StreamChunk, WebSocketMessage } from "./types/chat.types.js";
import type { CanUseTool, PermissionResult } from "./types/permission.types.js";
import { logWsIncoming, logWsOutgoing } from "./utils/ws-logger.js";

interface PendingPermission {
  toolName: string;
  toolInput: Record<string, unknown>;
}

interface PendingQuestion {
  questions: QuestionContent["questions"];
}

interface WebSocketState {
  messageQueue: MessageQueue;
  claudeService: ClaudeService;
  permissionService: PermissionService;
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

function createCanUseToolHandler(ws: WSContext, state: WebSocketState): CanUseTool {
  return async (
    toolName: string,
    input: Record<string, unknown>,
    _options: { signal: AbortSignal },
  ): Promise<PermissionResult> => {
    // Track tool usage
    if (!state.toolsUsed.includes(toolName)) {
      state.toolsUsed.push(toolName);
    }

    const requestId = crypto.randomUUID();

    // Handle AskUserQuestion specially
    if (toolName === "AskUserQuestion") {
      // Store pending question for later persistence
      state.pendingQuestions.set(requestId, {
        questions: input.questions as QuestionContent["questions"],
      });

      sendChunk(ws, state.sessionId, {
        type: "ask_user_question",
        requestId,
        questions: input.questions as StreamChunk["questions"],
      });
    } else {
      // Store pending permission for later persistence
      state.pendingPermissions.set(requestId, {
        toolName,
        toolInput: input,
      });

      // Send permission request to frontend
      sendChunk(ws, state.sessionId, {
        type: "tool_permission_request",
        requestId,
        toolName,
        toolInput: input,
      });
    }

    // Wait for user response
    return state.permissionService.waitForPermission(requestId);
  };
}

export function createWebSocketHandler(chatService: ChatService) {
  const claudeService = new ClaudeService({ model: env.CLAUDE_MODEL });

  return {
    onOpen: async (
      ws: WSContext,
      session: Session,
      _history: Message[],
      userId: string,
    ): Promise<WebSocketState> => {
      const messageQueue = claudeService.createMessageQueue();
      const permissionService = new PermissionService();

      const state: WebSocketState = {
        messageQueue,
        claudeService,
        permissionService,
        sessionId: session.id,
        userId,
        assistantContent: "",
        isProcessing: false,
        toolsUsed: [],
        pendingPermissions: new Map(),
        pendingQuestions: new Map(),
      };

      // Start Claude query with streaming input and canUseTool handler
      // Pass claudeSessionId for session resumption
      const claudeQuery = claudeService.startStreamingChat(messageQueue, {
        systemPrompt: session.systemPrompt ?? undefined,
        canUseTool: createCanUseToolHandler(ws, state),
        claudeSessionId: session.claudeSessionId ?? undefined,
      });

      // Process Claude responses in background
      processClaudeResponses(ws, claudeQuery, state, chatService);

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

          // Push to Claude's streaming input
          state.messageQueue.push(state.claudeService.createUserMessage(message.content));
          state.assistantContent = "";
          state.isProcessing = true;
        } else if (message.type === "interrupt") {
          // Note: interrupt() is available on the Query object
          // In a more complete implementation, we'd store the query reference
          sendChunk(ws, state.sessionId, {
            type: "error",
            message: "Interrupt not yet implemented",
          });
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

          // Handle tool permission response from user
          state.permissionService.resolvePermission(message.requestId, {
            requestId: message.requestId,
            decision: message.decision ?? "deny",
            modifiedInput: message.modifiedInput,
            message: message.message,
          });
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

          // Handle AskUserQuestion response from user
          state.permissionService.resolveWithAnswers(message.requestId, message.answers ?? {});
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Invalid message format";
        sendChunk(ws, state.sessionId, { type: "error", message: errorMessage });
      }
    },

    onClose: (state: WebSocketState): void => {
      state.permissionService.cancelAll("WebSocket closed");
      state.messageQueue.close();
    },
  };
}

async function processClaudeResponses(
  ws: WSContext,
  claudeQuery: ReturnType<ClaudeService["startStreamingChat"]>,
  state: WebSocketState,
  chatService: ChatService,
): Promise<void> {
  const claudeService = state.claudeService;
  let streamStarted = false;

  try {
    for await (const chunk of claudeService.processMessages(claudeQuery)) {
      if (chunk.type === "session_init" && chunk.claudeSessionId) {
        // Store Claude session ID in database for future session resumption
        await chatService.updateClaudeSessionId(state.sessionId, chunk.claudeSessionId);
      } else if (chunk.type === "content" && chunk.content) {
        // Send stream_start before first content
        if (!streamStarted) {
          sendChunk(ws, state.sessionId, { type: "stream_start" });
          streamStarted = true;
        }
        state.assistantContent += chunk.content;
        sendChunk(ws, state.sessionId, { type: "chunk", content: chunk.content });
      } else if (chunk.type === "done") {
        // Send stream_end if we started streaming
        if (streamStarted) {
          sendChunk(ws, state.sessionId, { type: "stream_end" });
          streamStarted = false;
        }

        // Save complete assistant message
        if (state.assistantContent) {
          const savedMessage = await chatService.saveAssistantMessage(
            state.sessionId,
            state.assistantContent,
            chunk.metadata,
          );

          sendChunk(ws, state.sessionId, {
            type: "done",
            messageId: savedMessage.id,
            metadata: chunk.metadata,
          });
        }

        state.assistantContent = "";
        state.isProcessing = false;
      }
    }
  } catch (error) {
    // Send stream_end if we were streaming when error occurred
    if (streamStarted) {
      sendChunk(ws, state.sessionId, { type: "stream_end" });
    }
    const errorMessage = error instanceof Error ? error.message : "Claude processing error";
    sendChunk(ws, state.sessionId, { type: "error", message: errorMessage });
  }
}

export type WebSocketHandler = ReturnType<typeof createWebSocketHandler>;
