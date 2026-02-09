import { query } from "@anthropic-ai/claude-agent-sdk";
import type { RawData, WebSocket } from "ws";
import {
  checkSessionExists,
  createUserMessage,
  type SessionMessageQueue,
} from "../session/index.js";
import type { PermissionRegistry } from "../session/permission-registry.js";
import { createTaskMcpServer } from "../tools/index.js";
import type { ExecFn, HandlerDependencies, IncomingMessage } from "../types/index.js";
import { sendMessage } from "../websocket/send.js";

import { processClaudeMessages } from "./claude-processor.js";
import { createCanUseTool } from "./permission-handler.js";

export interface MessageHandlerDeps extends HandlerDependencies {
  sessionQueue: SessionMessageQueue;
  permissionRegistry: PermissionRegistry;
  execFn: ExecFn;
  model: string;
}

/**
 * Handle start message - initialize Claude query
 */
export async function handleStart(
  ws: WebSocket,
  message: IncomingMessage,
  deps: MessageHandlerDeps,
): Promise<void> {
  const { sessions, sessionQueue, logger, syncSession, execFn, model } = deps;

  logger.info("Starting session", {
    hasContent: !!message.content,
    hasSystemPrompt: !!message.systemPrompt,
    sessionId: message.sessionId,
    resume: !!message.resume,
  });

  // Verify API key is set (set via setEnvVars() by the Worker)
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error("ANTHROPIC_API_KEY not set");
    sendMessage(
      ws,
      {
        type: "error",
        message: "ANTHROPIC_API_KEY not set in environment",
      },
      logger,
    );
    return;
  }

  logger.info("API key present, starting query");

  // Check if session data exists on disk before attempting to resume
  const sessionExists = message.sessionId
    ? await checkSessionExists(message.sessionId, execFn, logger)
    : false;
  logger.info("Session check", { sessionId: message.sessionId, exists: sessionExists });

  // Store session info
  sessions.set(ws, {
    sessionId: message.sessionId ?? null,
    taskId: message.taskId ?? null,
    projectId: message.projectId ?? null,
  });

  // Create infinite prompt generator for this WebSocket
  // This generator stays alive until the WebSocket closes
  const promptGenerator = sessionQueue.consume(ws);

  // Create MCP server for task tools if this is a task session
  const apiBaseUrl = process.env.API_BASE_URL;
  const apiToken = process.env.INTERNAL_API_TOKEN;
  const hasTaskTools = !!(message.taskId && apiBaseUrl && apiToken);

  const mcpServers = hasTaskTools
    ? {
        "task-tools": createTaskMcpServer({
          taskId: message.taskId as string,
          apiBaseUrl,
          apiToken,
          ws,
          logger,
        }),
      }
    : undefined;

  // Start Claude query with session-id for persistence
  // - tools: restricts available built-in tools
  // - canUseTool: routes permission requests to the frontend via WebSocket
  // - extraArgs: { "session-id": ... } sets the session ID for new sessions
  // - resume: sessionId restores existing session state from disk
  const canUseTool = createCanUseTool(ws, deps.permissionRegistry, logger);

  const claudeQuery = query({
    prompt: promptGenerator,
    options: {
      model,
      systemPrompt: message.systemPrompt,
      mcpServers,
      tools: ["WebFetch", "WebSearch", "AskUserQuestion"],
      canUseTool,
      extraArgs:
        !sessionExists && message.sessionId ? { "session-id": message.sessionId } : undefined,
      resume: sessionExists ? message.sessionId : undefined,
    },
  });

  // Process messages in background with error handling
  // This loop runs until the WebSocket closes or an error occurs
  processClaudeMessages(ws, claudeQuery, message.sessionId ?? null, logger, syncSession).catch(
    (error) => {
      logger.error("Claude processing error", error instanceof Error ? error.stack : error);
      sendMessage(ws, { type: "error", message: "Claude processing failed" }, logger);
    },
  );

  // Send initial message if provided
  if (message.content) {
    sessionQueue.enqueue(ws, createUserMessage(message.content, message.sessionId ?? ""));
  }
}

/**
 * Handle user message
 */
export function handleUserMessage(
  ws: WebSocket,
  message: IncomingMessage,
  deps: MessageHandlerDeps,
): void {
  const { sessions, sessionQueue, logger } = deps;

  logger.info("Received user message", { contentLength: message.content?.length ?? 0 });

  const session = sessions.get(ws);
  if (!session) {
    logger.error("Session not initialized for user message");
    sendMessage(ws, { type: "error", message: "Session not initialized" }, logger);
    return;
  }

  if (message.content) {
    logger.info("Pushing message to Claude queue");
    sessionQueue.enqueue(ws, createUserMessage(message.content, session.sessionId ?? ""));
  }
}

/**
 * Handle close message
 */
export function handleClose(
  ws: WebSocket,
  deps: Pick<MessageHandlerDeps, "sessions" | "sessionQueue" | "permissionRegistry">,
): void {
  deps.sessionQueue.cleanup(ws);
  deps.permissionRegistry.cleanupForSocket(ws);
  deps.sessions.delete(ws);
}

/**
 * Handle permission response from frontend
 */
function handlePermissionResponse(
  message: IncomingMessage,
  deps: Pick<MessageHandlerDeps, "permissionRegistry" | "logger">,
): void {
  const { permissionRegistry, logger } = deps;

  if (!message.requestId || !message.decision) {
    logger.error("Invalid permission response", {
      hasRequestId: !!message.requestId,
      hasDecision: !!message.decision,
    });
    return;
  }

  const resolved = permissionRegistry.resolve(message.requestId, {
    decision: message.decision,
    modifiedInput: message.modifiedInput,
  });

  if (!resolved) {
    logger.info("Permission response for unknown request", {
      requestId: message.requestId,
    });
  }
}

/**
 * Handle incoming WebSocket message
 */
export async function handleMessage(
  data: RawData,
  ws: WebSocket,
  deps: MessageHandlerDeps,
): Promise<void> {
  const { logger } = deps;

  try {
    const raw = data.toString();
    logger.info(`IN: ${raw}`);
    const message = JSON.parse(raw) as IncomingMessage;

    switch (message.type) {
      case "start":
        await handleStart(ws, message, deps);
        break;
      case "message":
        handleUserMessage(ws, message, deps);
        break;
      case "permission_response":
        handlePermissionResponse(message, deps);
        break;
      case "close":
        handleClose(ws, deps);
        ws.close();
        break;
      default:
        logger.info("Unhandled message type", { type: (message as { type: string }).type });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid message";
    sendMessage(ws, { type: "error", message: errorMessage }, logger);
  }
}

/**
 * Handle WebSocket connection
 */
export function handleConnection(ws: WebSocket, deps: MessageHandlerDeps): void {
  const { logger } = deps;

  logger.info("Client connected");

  ws.on("message", (data: RawData) => {
    handleMessage(data, ws, deps).catch((error) => {
      logger.error("Message handler error", error instanceof Error ? error.message : error);
      sendMessage(ws, { type: "error", message: "Internal server error" }, logger);
    });
  });

  ws.on("close", () => {
    logger.info("Client disconnected");
    handleClose(ws, deps);
  });

  ws.on("error", (error: Error) => {
    logger.error("WebSocket error", error.message);
  });
}
