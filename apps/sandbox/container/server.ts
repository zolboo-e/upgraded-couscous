/**
 * WebSocket server for Claude Agent SDK that runs inside the container.
 * Uses Node.js with @hono/node-server and ws package.
 */

import { exec } from "node:child_process";
import { appendFileSync } from "node:fs";
import type { Server } from "node:http";
import { promisify } from "node:util";
import { query, type SDKMessage, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { serve } from "@hono/node-server";
import { Redis } from "@upstash/redis";
import { Hono } from "hono";
import { type RawData, WebSocket, WebSocketServer } from "ws";

// Upstash Redis client for shutdown logging (testing)
const redis = new Redis({
  url: "https://tough-emu-62604.upstash.io",
  token: "AfSMAAIncDFiMDlhODIzMzgyZGM0YWM0YTc1ZDlmYWVjZjBkNjQ3MHAxNjI2MDQ",
});

const execAsync = promisify(exec);

const LOG_FILE = "/tmp/server.log";

async function checkSessionExists(sessionId: string, retries = 3): Promise<boolean> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Check if session file exists in Claude's session storage
      // Claude Agent SDK stores sessions by ID in ~/.claude/
      const result = await execAsync(
        `find /root/.claude -name "*${sessionId}*" -type f 2>/dev/null | head -1`,
      );
      if (result.stdout.trim().length > 0) {
        return true;
      }
      // Wait briefly before retry to allow filesystem to settle
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch {
      // Continue to next retry
    }
  }
  return false;
}

// Simple logger with timestamps - writes to console, file, and Upstash
function log(level: "info" | "error" | "debug", message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const line =
    data !== undefined ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;

  console.log(line);
  appendFileSync(LOG_FILE, `${line}\n`);

  // Also push to Upstash (fire and forget)
  redis.lpush("sandbox:server:logs", line).catch(() => {});
}

interface IncomingMessage {
  type: "start" | "message" | "close";
  content?: string;
  systemPrompt?: string;
  sessionId?: string; // DB session UUID - used as Claude session ID
  resume?: boolean; // true = resume existing session, false/undefined = new session
}

interface OutgoingMessage {
  type: "stream_start" | "chunk" | "stream_end" | "done" | "error";
  content?: string;
  message?: string;
  metadata?: {
    tokensUsed?: number;
    stopReason?: string;
  };
}

interface SessionState {
  sessionId: string | null; // DB session UUID for R2 sync path
}

// Track active sessions
const sessions = new Map<WebSocket, SessionState>();

/**
 * Manages per-session infinite message queues.
 * Each WebSocket gets its own queue that stays alive until the connection closes.
 */
class SessionMessageQueue {
  private queues = new Map<WebSocket, SDKUserMessage[]>();
  private resolvers = new Map<WebSocket, (msg: SDKUserMessage) => void>();
  private closed = new Set<WebSocket>();

  enqueue(ws: WebSocket, msg: SDKUserMessage): void {
    if (this.closed.has(ws)) {
      log("debug", "Ignoring message for closed session");
      return;
    }

    const resolver = this.resolvers.get(ws);
    if (resolver) {
      resolver(msg);
      this.resolvers.delete(ws);
    } else {
      const queue = this.queues.get(ws) || [];
      queue.push(msg);
      this.queues.set(ws, queue);
    }
  }

  async *consume(ws: WebSocket): AsyncGenerator<SDKUserMessage> {
    while (!this.closed.has(ws)) {
      const queue = this.queues.get(ws);
      const msg = queue?.shift();
      if (msg !== undefined) {
        yield msg;
      } else {
        try {
          const nextMsg = await new Promise<SDKUserMessage>((resolve, reject) => {
            // Check if closed while waiting
            if (this.closed.has(ws)) {
              reject(new Error("Session closed"));
              return;
            }
            this.resolvers.set(ws, resolve);
          });
          yield nextMsg;
        } catch {
          // Session was closed while waiting
          break;
        }
      }
    }
    log("debug", "Message queue consumer exited");
  }

  cleanup(ws: WebSocket): void {
    this.closed.add(ws);
    // Reject any pending resolver to unblock the consumer
    const resolver = this.resolvers.get(ws);
    if (resolver) {
      // Resolve with a dummy message that will be ignored due to closed check
      this.resolvers.delete(ws);
    }
    this.queues.delete(ws);
    // Allow cleanup to be called multiple times safely
    setTimeout(() => this.closed.delete(ws), 1000);
  }
}

const sessionQueue = new SessionMessageQueue();

function createUserMessage(content: string): SDKUserMessage {
  return {
    type: "user",
    session_id: "",
    message: {
      role: "user",
      content: [{ type: "text", text: content }],
    },
    parent_tool_use_id: null,
  };
}

async function syncSessionToPersistent(sessionId: string | null): Promise<void> {
  if (process.env.ENVIRONMENT !== "production") {
    log("debug", "Session sync skipped (not production)");
    return;
  }

  if (!sessionId) {
    log("debug", "Session sync skipped (no sessionId)");
    return;
  }

  const targetBase = `/persistent/${sessionId}/.claude`;
  log("info", "Starting background sync to persistent storage", { sessionId });

  // Ensure target directories exist, then run rsync in background with --update
  execAsync(`mkdir -p ${targetBase}/projects ${targetBase}/todos`)
    .then(() => {
      // Run rsync in background with --update (skip newer files on destination)
      const projectsStart = Date.now();
      execAsync(`rsync -a /root/.claude/projects/ ${targetBase}/projects/`)
        .then(() =>
          log("info", "Rsync projects completed", {
            sessionId,
            durationMs: Date.now() - projectsStart,
          }),
        )
        .catch((error) =>
          log("error", "Rsync projects failed", {
            sessionId,
            durationMs: Date.now() - projectsStart,
            error: error instanceof Error ? error.message : error,
          }),
        );

      const todosStart = Date.now();
      execAsync(`rsync -a /root/.claude/todos/ ${targetBase}/todos/`)
        .then(() =>
          log("info", "Rsync todos completed", { sessionId, durationMs: Date.now() - todosStart }),
        )
        .catch((error) =>
          log("error", "Rsync todos failed", {
            sessionId,
            durationMs: Date.now() - todosStart,
            error: error instanceof Error ? error.message : error,
          }),
        );

      log("info", "Background rsync started", { sessionId });
    })
    .catch((error) => {
      log(
        "error",
        "Failed to create sync directories",
        error instanceof Error ? error.message : error,
      );
    });
}

function sendMessage(ws: WebSocket, msg: OutgoingMessage): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(msg);
      log("info", `OUT: ${json}`);
      ws.send(json);
      return true;
    }
    return false;
  } catch (error) {
    log("error", "Error sending message", error);
    return false;
  }
}

async function processClaudeMessages(
  ws: WebSocket,
  claudeQuery: AsyncIterable<SDKMessage>,
  sessionId: string | null,
): Promise<void> {
  let streamStarted = false;

  try {
    log("info", "Starting Claude query processing");
    for await (const message of claudeQuery) {
      // Check if WebSocket is still open
      if (ws.readyState !== WebSocket.OPEN) {
        log("info", "WebSocket closed, stopping message processing");
        break;
      }

      if (message.type === "result") {
        log("info", "Received SDK result message", message);
      } else {
        log("debug", "Received SDK message", {
          type: message.type,
          subtype: (message as { subtype?: string }).subtype,
        });
      }

      // Handle assistant message content
      if (message.type === "assistant") {
        const content = message.message.content;
        if (Array.isArray(content)) {
          const textContent = content
            .filter((block): block is { type: "text"; text: string } => block.type === "text")
            .map((block) => block.text)
            .join("");

          if (textContent) {
            if (!streamStarted) {
              sendMessage(ws, { type: "stream_start" });
              streamStarted = true;
            }
            sendMessage(ws, { type: "chunk", content: textContent });
          }
        }
      }

      // Handle result message
      if (message.type === "result") {
        if (streamStarted) {
          sendMessage(ws, { type: "stream_end" });
          streamStarted = false;
        }

        // Sync session files to persistent storage
        await syncSessionToPersistent(sessionId);

        sendMessage(ws, {
          type: "done",
          metadata: {
            tokensUsed: (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
            stopReason: message.subtype,
          },
        });
      }
    }
    log("info", "Claude query completed");
  } catch (error) {
    log("error", "Claude query error", error instanceof Error ? error.stack : error);
    if (streamStarted) {
      sendMessage(ws, { type: "stream_end" });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    sendMessage(ws, { type: "error", message: errorMessage });
  }
}

async function handleStart(ws: WebSocket, message: IncomingMessage): Promise<void> {
  log("info", "Starting session", {
    hasContent: !!message.content,
    hasSystemPrompt: !!message.systemPrompt,
    sessionId: message.sessionId,
    resume: !!message.resume,
  });

  // Verify API key is set (set via setEnvVars() by the Worker)
  if (!process.env.ANTHROPIC_API_KEY) {
    log("error", "ANTHROPIC_API_KEY not set");
    sendMessage(ws, {
      type: "error",
      message: "ANTHROPIC_API_KEY not set in environment",
    });
    return;
  }

  log("info", "API key present, starting query");

  // Check if session data exists on disk before attempting to resume
  const sessionExists = message.sessionId ? await checkSessionExists(message.sessionId) : false;
  log("info", "Session check", { sessionId: message.sessionId, exists: sessionExists });

  // Store session info
  sessions.set(ws, {
    sessionId: message.sessionId ?? null,
  });

  // Create infinite prompt generator for this WebSocket
  // This generator stays alive until the WebSocket closes
  const promptGenerator = sessionQueue.consume(ws);

  // Start Claude query with session-id for persistence
  // - extraArgs: { "session-id": ... } sets the session ID for new sessions
  // - resume: sessionId restores existing session state from disk
  const claudeQuery = query({
    prompt: promptGenerator,
    options: {
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      systemPrompt: message.systemPrompt,
      extraArgs:
        !sessionExists && message.sessionId ? { "session-id": message.sessionId } : undefined,
      resume: sessionExists ? message.sessionId : undefined,
    },
  });

  // Process messages in background with error handling
  // This loop runs until the WebSocket closes or an error occurs
  processClaudeMessages(ws, claudeQuery, message.sessionId ?? null).catch((error) => {
    log("error", "Claude processing error", error instanceof Error ? error.stack : error);
    sendMessage(ws, { type: "error", message: "Claude processing failed" });
  });

  // Send initial message if provided
  if (message.content) {
    sessionQueue.enqueue(ws, createUserMessage(message.content));
  }
}

function handleUserMessage(ws: WebSocket, message: IncomingMessage): void {
  log("info", "Received user message", { contentLength: message.content?.length ?? 0 });

  const session = sessions.get(ws);
  if (!session) {
    log("error", "Session not initialized for user message");
    sendMessage(ws, { type: "error", message: "Session not initialized" });
    return;
  }

  if (message.content) {
    log("info", "Pushing message to Claude queue");
    sessionQueue.enqueue(ws, createUserMessage(message.content));
  }
}

function handleClose(ws: WebSocket): void {
  sessionQueue.cleanup(ws);
  sessions.delete(ws);
}

async function handleMessage(data: RawData, ws: WebSocket): Promise<void> {
  try {
    const raw = data.toString();
    log("info", `IN: ${raw}`);
    const message = JSON.parse(raw) as IncomingMessage;

    switch (message.type) {
      case "start":
        await handleStart(ws, message);
        break;
      case "message":
        handleUserMessage(ws, message);
        break;
      case "close":
        handleClose(ws);
        ws.close();
        break;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid message";
    sendMessage(ws, { type: "error", message: errorMessage });
  }
}

function handleConnection(ws: WebSocket): void {
  log("info", "Client connected");

  ws.on("message", (data: RawData) => {
    handleMessage(data, ws).catch((error) => {
      log("error", "Message handler error", error instanceof Error ? error.message : error);
      sendMessage(ws, { type: "error", message: "Internal server error" });
    });
  });

  ws.on("close", () => {
    log("info", "Client disconnected");
    handleClose(ws);
  });

  ws.on("error", (error: Error) => {
    log("error", "WebSocket error", error.message);
  });
}

// Create Hono app for HTTP endpoints
const app = new Hono();

// Health check endpoint
app.get("/health", (c) => {
  return c.text("Claude Agent SDK WebSocket Server");
});

// Start HTTP server
const server = serve({ fetch: app.fetch, port: 8080 }, () => {
  log("info", "Claude Agent SDK WebSocket server listening on port 8080");
});

// Create a single WebSocket server on root path (wsConnect doesn't preserve paths)
const wss = new WebSocketServer({ server: server as Server });

wss.on("connection", (ws) => {
  handleConnection(ws);
});

log("info", "WebSocket server attached (accepts all paths)");

// Shutdown log structure for Upstash
interface ShutdownLogEntry {
  timestamp: string;
  signal: string;
  sessionIds: string[];
  connectionsCount: number;
  syncedSessions: Array<{
    sessionId: string;
    status: "success" | "error";
    error?: string;
  }>;
  shutdownStatus: "success" | "timeout" | "error";
  errorMessage?: string;
  durationMs: number;
  logs: string;
}

// Log shutdown data to Upstash Redis
async function logShutdownToUpstash(entry: ShutdownLogEntry): Promise<void> {
  try {
    await redis.lpush("sandbox:shutdown:logs", JSON.stringify(entry));
    log("info", "Shutdown logged to Upstash");
  } catch (error) {
    log("error", "Failed to log to Upstash", error instanceof Error ? error.message : error);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  const startTime = Date.now();
  log("info", `Received ${signal} - starting graceful shutdown`);

  const syncResults: ShutdownLogEntry["syncedSessions"] = [];
  const sessionIds: string[] = [];
  let shutdownStatus: ShutdownLogEntry["shutdownStatus"] = "success";
  let errorMessage: string | undefined;

  try {
    // 1. Close all WebSocket connections gracefully
    const closePromises: Promise<void>[] = [];
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        closePromises.push(
          new Promise<void>((resolve) => {
            client.close(1001, "Server shutting down");
            client.once("close", () => resolve());
            // Timeout if client doesn't respond
            setTimeout(resolve, 1000);
          }),
        );
      }
    });
    await Promise.all(closePromises);
    log("info", `Closed ${closePromises.length} WebSocket connections`);

    // 2. Clean up all sessions and sync to persistent storage
    for (const [ws, session] of sessions.entries()) {
      sessionQueue.cleanup(ws);
      if (session.sessionId) {
        sessionIds.push(session.sessionId);
        try {
          await syncSessionToPersistent(session.sessionId);
          syncResults.push({ sessionId: session.sessionId, status: "success" });
        } catch (error) {
          syncResults.push({
            sessionId: session.sessionId,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    sessions.clear();

    // 3. Log to Upstash before closing servers
    const logs = await (async () => {
      try {
        const { stdout } = await execAsync("cat /tmp/server.log 2>/dev/null || echo ''");
        return stdout;
      } catch {
        return "";
      }
    })();

    await logShutdownToUpstash({
      timestamp: new Date().toISOString(),
      signal,
      sessionIds,
      connectionsCount: closePromises.length,
      syncedSessions: syncResults,
      shutdownStatus,
      durationMs: Date.now() - startTime,
      logs,
    });

    // 4. Close WebSocket server
    wss.close(() => {
      log("info", "WebSocket server closed");
    });

    // 5. Close HTTP server
    server.close(() => {
      log("info", "HTTP server closed");
      process.exit(0);
    });

    // Force exit after timeout (Cloudflare grace period is ~10-30s)
    setTimeout(async () => {
      log("error", "Shutdown timeout exceeded - forcing exit");
      await logShutdownToUpstash({
        timestamp: new Date().toISOString(),
        signal,
        sessionIds,
        connectionsCount: closePromises.length,
        syncedSessions: syncResults,
        shutdownStatus: "timeout",
        durationMs: Date.now() - startTime,
        logs,
      });
      process.exit(1);
    }, 8000);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Shutdown error", errorMessage);
    shutdownStatus = "error";

    // Log error to Upstash
    const logs = await (async () => {
      try {
        const { stdout } = await execAsync("cat /tmp/server.log 2>/dev/null || echo ''");
        return stdout;
      } catch {
        return "";
      }
    })();

    await logShutdownToUpstash({
      timestamp: new Date().toISOString(),
      signal,
      sessionIds,
      connectionsCount: 0,
      syncedSessions: syncResults,
      shutdownStatus,
      errorMessage,
      durationMs: Date.now() - startTime,
      logs,
    });

    process.exit(1);
  }
}

// Register signal handlers for graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
