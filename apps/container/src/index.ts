/**
 * WebSocket server for Claude Agent SDK that runs inside the container.
 * Uses Node.js with @hono/node-server and ws package.
 */

import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { type WebSocket, WebSocketServer } from "ws";
import { handleConnection, type MessageHandlerDeps } from "./handlers/index.js";
import { createLogger, execAsync } from "./logger.js";
import { SessionMessageQueue } from "./session/index.js";
import { createGracefulShutdown } from "./shutdown/index.js";
import { syncSessionToPersistent } from "./sync/index.js";
import { createTelemetry, DEFAULT_REDIS_TOKEN, DEFAULT_REDIS_URL } from "./telemetry.js";
import type { SessionState } from "./types.js";

// Create telemetry client
const telemetry = createTelemetry(DEFAULT_REDIS_URL, DEFAULT_REDIS_TOKEN);

// Create logger with telemetry
const logger = createLogger(telemetry);

// Track active sessions
const sessions = new Map<WebSocket, SessionState>();

// Create message queue
const sessionQueue = new SessionMessageQueue(logger);

// Get model from environment
const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
const environment = process.env.ENVIRONMENT;

// Create sync function
const syncSession = (sessionId: string | null): Promise<void> => {
  return syncSessionToPersistent(sessionId, execAsync, logger, environment);
};

// Create handler dependencies
const handlerDeps: MessageHandlerDeps = {
  sessions,
  sessionQueue,
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
const server = serve({ fetch: app.fetch, port: 8080 }, () => {
  logger.info("Claude Agent SDK WebSocket server listening on port 8080");
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
