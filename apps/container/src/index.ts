/**
 * WebSocket server for Claude Agent SDK that runs inside the container.
 * Uses Node.js with @hono/node-server and ws package.
 */

import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { type WebSocket, WebSocketServer } from "ws";
import { getModel, SERVER_CONFIG } from "./config/index.js";
import { handleConnection, type MessageHandlerDeps } from "./handlers/index.js";
import {
  createLogger,
  createTelemetry,
  execAsync,
  syncSessionToPersistent,
} from "./services/index.js";
import { PermissionRegistry, QuestionRegistry, SessionMessageQueue } from "./session/index.js";
import { createGracefulShutdown } from "./shutdown/index.js";
import type { SessionState } from "./types/index.js";

// Create telemetry client (uses env vars, no-op if not configured)
const telemetry = createTelemetry();

// Create logger with telemetry
const logger = createLogger(telemetry);

// Track active sessions
const sessions = new Map<WebSocket, SessionState>();

// Create message queue and registries
const sessionQueue = new SessionMessageQueue(logger);
const permissionRegistry = new PermissionRegistry(logger);
const questionRegistry = new QuestionRegistry(logger);

// Get model from environment
const model = getModel();

// Create sync function
const syncSession = (sessionId: string | null): Promise<void> => {
  return syncSessionToPersistent(sessionId, execAsync, logger);
};

// Create handler dependencies
const handlerDeps: MessageHandlerDeps = {
  sessions,
  sessionQueue,
  permissionRegistry,
  questionRegistry,
  logger,
  syncSession,
  execFn: execAsync,
  model,
};

// Create Hono app for HTTP endpoints
const app = new Hono();

// Health check endpoint
app.get("/health", (c) => {
  return c.text("Claude Agent SDK WebSocket Server");
});

// Start HTTP server
const server = serve({ fetch: app.fetch, port: SERVER_CONFIG.port }, () => {
  logger.info(`Claude Agent SDK WebSocket server listening on port ${SERVER_CONFIG.port}`);
});

// Create a single WebSocket server on root path (wsConnect doesn't preserve paths)
const wss = new WebSocketServer({ server: server as Server });

wss.on("connection", (ws) => {
  handleConnection(ws, handlerDeps);
});

logger.info("WebSocket server attached (accepts all paths)");

// Create graceful shutdown handler
const gracefulShutdown = createGracefulShutdown({
  wss,
  server: server as Server,
  sessions,
  sessionQueue,
  syncSession,
  telemetry,
  logger,
  execFn: execAsync,
});

// Register signal handlers for graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
