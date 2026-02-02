import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { type RawData, WebSocket, WebSocketServer } from "ws";
import type { PermissionResult } from "./claude/client";
import {
  getSession,
  setSyncHooks,
  startChatSession,
  updateSessionWebSocket,
} from "./claude/stream";
import { messageQueue, permissionQueue, planQueue, questionQueue } from "./queue";
import { createSessionSyncHooks } from "./sync";

// Initialize sync hooks at startup
setSyncHooks(createSessionSyncHooks());

const app = new Hono();

interface StartChatPayload {
  type: "start_chat";
  workingDirectory?: string;
}

interface SendMessagePayload {
  type: "send_message";
  chatId: string;
  content: string;
}

interface PermissionResponsePayload {
  type: "permission_response";
  permissionId: string;
  allowed: boolean;
  message?: string;
}

interface QuestionResponsePayload {
  type: "question_response";
  questionId: string;
  answers: Record<string, string>;
}

interface PlanResponsePayload {
  type: "plan_response";
  planId: string;
  approved: boolean;
}

interface ResumeChatPayload {
  type: "resume_chat";
  chatId: string;
  workingDirectory?: string;
}

interface PongPayload {
  type: "pong";
}

type WebSocketMessage =
  | StartChatPayload
  | ResumeChatPayload
  | SendMessagePayload
  | PermissionResponsePayload
  | QuestionResponsePayload
  | PlanResponsePayload
  | PongPayload;

// Track chat ID per WebSocket connection
const wsToChat = new WeakMap<WebSocket, string>();

// Track active WebSockets for heartbeat
const activeWebSockets = new Set<WebSocket>();

// Heartbeat interval - send ping every 30 seconds to keep connections alive
setInterval(() => {
  for (const ws of activeWebSockets) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      } else {
        activeWebSockets.delete(ws);
      }
    } catch {
      activeWebSockets.delete(ws);
    }
  }
}, 30000);

function send(ws: WebSocket, data: unknown): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    console.warn("[send] WebSocket not open, readyState:", ws.readyState);
    return false;
  } catch (error) {
    console.error("[send] Error sending message:", error);
    return false;
  }
}

async function handleStartChat(data: StartChatPayload, ws: WebSocket): Promise<void> {
  const chatId = crypto.randomUUID();
  console.log(`[Chat] Starting new chat ${chatId}`);

  wsToChat.set(ws, chatId);

  // Start the chat session
  await startChatSession(chatId, null, ws, data.workingDirectory);

  send(ws, {
    type: "chat_started",
    chatId,
    sessionId: null,
  });
}

async function handleResumeChat(data: ResumeChatPayload, ws: WebSocket): Promise<void> {
  const { chatId } = data;
  console.log(`[Chat] Resuming chat ${chatId}`);

  // Get existing session if active
  const existingSession = getSession(chatId);
  const sessionId = existingSession?.sessionId ?? null;

  wsToChat.set(ws, chatId);

  // Start session with existing sessionId for resumption
  await startChatSession(chatId, sessionId, ws, data.workingDirectory);

  send(ws, {
    type: "chat_resumed",
    chatId,
    sessionId,
  });
}

async function handleSendMessage(data: SendMessagePayload, ws: WebSocket): Promise<void> {
  const { chatId, content } = data;
  console.log(`[Chat] Received message for chat ${chatId}`);

  // Check if session exists
  let session = getSession(chatId);

  if (!session) {
    // Start a new session if none exists
    await startChatSession(chatId, null, ws);
    session = getSession(chatId);
  } else {
    // Update WebSocket reference in case of reconnection
    updateSessionWebSocket(chatId, ws);
  }

  wsToChat.set(ws, chatId);

  const userMessageId = crypto.randomUUID();

  // Send user message confirmation
  send(ws, {
    type: "user_message",
    messageId: userMessageId,
    content,
  });

  // Enqueue message for agent processing
  const assistantMessageId = crypto.randomUUID();
  messageQueue.enqueue({
    chatId,
    content,
    userMessageId,
    assistantMessageId,
    sessionId: session?.sessionId ?? null,
  });

  console.log(`[Chat] Message enqueued for processing: ${assistantMessageId}`);
}

async function handlePermissionResponse(
  data: PermissionResponsePayload,
  ws: WebSocket,
): Promise<void> {
  const pending = permissionQueue.get(data.permissionId);
  if (!pending) {
    send(ws, {
      type: "error",
      error: "Permission request not found or already resolved",
    });
    return;
  }

  const result: PermissionResult = data.allowed
    ? { behavior: "allow", updatedInput: pending.toolInput }
    : { behavior: "deny", message: data.message || "User denied permission" };

  await permissionQueue.resolve(data.permissionId, result);
}

async function handleQuestionResponse(data: QuestionResponsePayload, ws: WebSocket): Promise<void> {
  const resolved = await questionQueue.resolve(data.questionId, data.answers);

  if (!resolved) {
    send(ws, {
      type: "error",
      error: "Question not found or already resolved",
    });
  }
}

async function handlePlanResponse(data: PlanResponsePayload, ws: WebSocket): Promise<void> {
  const resolved = await planQueue.resolve(data.planId, data.approved);

  if (!resolved) {
    send(ws, {
      type: "error",
      error: "Plan not found or already resolved",
    });
  }
}

async function handleMessage(data: RawData, ws: WebSocket): Promise<void> {
  try {
    const message = JSON.parse(data.toString()) as WebSocketMessage;

    switch (message.type) {
      case "start_chat":
        await handleStartChat(message, ws);
        break;
      case "resume_chat":
        await handleResumeChat(message, ws);
        break;
      case "send_message":
        await handleSendMessage(message, ws);
        break;
      case "permission_response":
        await handlePermissionResponse(message, ws);
        break;
      case "question_response":
        await handleQuestionResponse(message, ws);
        break;
      case "plan_response":
        await handlePlanResponse(message, ws);
        break;
      case "pong":
        // Client acknowledging ping - connection is alive
        break;
      default:
        send(ws, { type: "error", error: "Unknown message type" });
    }
  } catch (error) {
    console.error("[Chat] Message handling error:", error);
    send(ws, {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

function handleConnection(ws: WebSocket): void {
  console.log("[Chat] Client connected");
  activeWebSockets.add(ws);

  ws.on("message", (data: RawData) => {
    handleMessage(data, ws);
  });

  ws.on("close", () => {
    console.log("[Chat] Client disconnected");
    activeWebSockets.delete(ws);
    const chatId = wsToChat.get(ws);
    if (chatId) {
      wsToChat.delete(ws);
    }
  });
}

app.get("/", (c) => c.text("Claude Chat Server"));

// Periodic cleanup of stale queues
setInterval(() => {
  permissionQueue.cleanup(5 * 60 * 1000);
  questionQueue.cleanup(5 * 60 * 1000);
  planQueue.cleanup(10 * 60 * 1000);
}, 60 * 1000);

// Start HTTP server
const server = serve({ fetch: app.fetch, port: 8080 }, () => {
  console.log("Chat server listening on port 8080");
});

// Attach WebSocket server
const wss = new WebSocketServer({ server: server as Server });
wss.on("connection", handleConnection);
