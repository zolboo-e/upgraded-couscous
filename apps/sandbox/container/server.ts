/**
 * WebSocket server for Claude Agent SDK that runs inside the container.
 * Uses Node.js with @hono/node-server and ws package.
 */

// import { exec } from "node:child_process";
import type { Server } from "node:http";
// import { promisify } from "node:util";
import { query, type SDKMessage, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { type RawData, WebSocket, WebSocketServer } from "ws";

// const execAsync = promisify(exec);

// Simple logger with timestamps
function log(level: "info" | "error" | "debug", message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, JSON.stringify(data));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

interface IncomingMessage {
  type: "start" | "message" | "close";
  content?: string;
  systemPrompt?: string;
  sessionId?: string; // DB session UUID - used as Claude session ID
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
  messageQueue: AsyncIterableIterator<SDKUserMessage> | null;
  pushMessage: ((msg: SDKUserMessage) => void) | null;
  closeQueue: (() => void) | null;
}

// Track active sessions
const sessions = new Map<WebSocket, SessionState>();

// Create a message queue that can receive messages asynchronously
function createMessageQueue(): {
  iterator: AsyncIterableIterator<SDKUserMessage>;
  push: (msg: SDKUserMessage) => void;
  close: () => void;
} {
  const queue: SDKUserMessage[] = [];
  let resolve: ((result: IteratorResult<SDKUserMessage>) => void) | null = null;
  let done = false;

  const iterator: AsyncIterableIterator<SDKUserMessage> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next(): Promise<IteratorResult<SDKUserMessage>> {
      const nextMessage = queue.shift();
      if (nextMessage !== undefined) {
        return { value: nextMessage, done: false };
      }
      if (done) {
        return { value: undefined as unknown as SDKUserMessage, done: true };
      }
      return new Promise((res) => {
        resolve = res;
      });
    },
  };

  return {
    iterator,
    push: (msg: SDKUserMessage) => {
      if (resolve) {
        resolve({ value: msg, done: false });
        resolve = null;
      } else {
        queue.push(msg);
      }
    },
    close: () => {
      done = true;
      if (resolve) {
        resolve({ value: undefined as unknown as SDKUserMessage, done: true });
      }
    },
  };
}

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

async function syncSessionToPersistent(): Promise<void> {
  // Disabled: R2 bucket mount not configured on Cloudflare
  log("debug", "Session sync disabled (R2 not mounted)");
  //   try {
  //     log("info", "Syncing session to persistent storage");

  //     // Ensure target directory exists
  //     await execAsync("mkdir -p /persistent/.claude");

  //     // Sync ~/.claude to /persistent/.claude using rsync
  //     await execAsync("rsync -a /root/.claude/ /persistent/.claude/");

  //     // Force flush to ensure writes are persisted
  //     await execAsync("sync");

  //     log("info", "Session synced to persistent storage");
  //   } catch (error) {
  //     log("error", "Failed to sync session", error instanceof Error ? error.message : error);
  //   }
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
): Promise<void> {
  let streamStarted = false;

  try {
    log("info", "Starting Claude query processing");
    for await (const message of claudeQuery) {
      log("debug", "Received SDK message", {
        type: message.type,
        subtype: (message as { subtype?: string }).subtype,
      });

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
        await syncSessionToPersistent();

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

  // Create message queue for streaming input
  const { iterator, push, close } = createMessageQueue();

  // Store session info
  sessions.set(ws, {
    messageQueue: iterator,
    pushMessage: push,
    closeQueue: close,
  });

  // Start Claude query with session-id for persistence
  const claudeQuery = query({
    prompt: iterator,
    options: {
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      systemPrompt: message.systemPrompt,
      extraArgs: message.sessionId ? { "session-id": message.sessionId } : undefined,
    },
  });

  // Process messages in background with error handling
  processClaudeMessages(ws, claudeQuery).catch((error) => {
    log("error", "Claude processing error", error instanceof Error ? error.stack : error);
    sendMessage(ws, { type: "error", message: "Claude processing failed" });
  });

  // Send initial message if provided
  if (message.content) {
    push(createUserMessage(message.content));
  }
}

function handleUserMessage(ws: WebSocket, message: IncomingMessage): void {
  log("info", "Received user message", { contentLength: message.content?.length ?? 0 });

  const session = sessions.get(ws);
  if (!session?.pushMessage) {
    log("error", "Session not initialized for user message");
    sendMessage(ws, { type: "error", message: "Session not initialized" });
    return;
  }

  if (message.content) {
    log("info", "Pushing message to Claude queue");
    session.pushMessage(createUserMessage(message.content));
  }
}

function handleClose(ws: WebSocket): void {
  const session = sessions.get(ws);
  if (session?.closeQueue) {
    session.closeQueue();
  }
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

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  log("info", `Received ${signal} - starting graceful shutdown`);

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

    // 2. Clean up all sessions
    for (const [, session] of sessions.entries()) {
      if (session.closeQueue) {
        session.closeQueue();
      }
    }
    sessions.clear();

    // 3. Final sync to persistent storage
    await syncSessionToPersistent();

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
    setTimeout(() => {
      log("error", "Shutdown timeout exceeded - forcing exit");
      process.exit(1);
    }, 8000);
  } catch (error) {
    log("error", "Shutdown error", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Register signal handlers for graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
