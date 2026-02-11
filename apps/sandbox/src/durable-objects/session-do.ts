/**
 * SessionDO - Durable Object for managing WebSocket sessions
 *
 * This DO handles:
 * - Browser WebSocket connections (with hibernation support)
 * - Container WebSocket relay
 * - Message persistence to API
 *
 * Uses hibernation API for cost savings during user idle time.
 */

import { DurableObject } from "cloudflare:workers";
import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { CONTAINER_CONFIG, isProduction, SANDBOX_CONFIG } from "../config/env.js";
import { mountR2Bucket, restoreSessionFromR2, waitForMount } from "../services/r2-sync.js";
import { MessagePersistenceQueue } from "./message-persistence-queue.js";
import { PendingMessageBuffer } from "./pending-message-buffer.js";
import { SyncManager } from "./sync-manager.js";

interface PermissionRequestData {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

interface QuestionRequestData {
  requestId: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiSelect: boolean;
  }>;
}

export class SessionDO extends DurableObject<Env> {
  private browserWs: WebSocket | null = null;
  private containerWs: WebSocket | null = null;
  private sandbox: Sandbox | null = null;
  private sessionId: string | null = null;
  private assistantContent = "";

  // Pending permission/question requests awaiting user response
  private pendingPermissions = new Map<string, PermissionRequestData>();
  private pendingQuestions = new Map<string, QuestionRequestData>();

  // Robust sync and persistence components
  private syncManager: SyncManager;
  private persistenceQueue: MessagePersistenceQueue;
  private pendingMessages: PendingMessageBuffer;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Initialize sync manager with debounce configuration
    this.syncManager = new SyncManager({
      debounceMs: 2000, // Wait 2s after last "done"
      maxDebounceMs: 10000, // Force sync after 10s max
      maxRetries: 3,
    });

    // Initialize persistence queue
    this.persistenceQueue = new MessagePersistenceQueue(
      env.API_BASE_URL ?? "",
      env.INTERNAL_API_TOKEN ?? "",
    );

    // Initialize pending message buffer
    this.pendingMessages = new PendingMessageBuffer();

    // Connect sync status to browser
    this.syncManager.setStatusCallback((status) => {
      this.sendSessionStatus(status);
    });
  }

  /**
   * Send session status to browser for UI display
   */
  private sendSessionStatus(status: string): void {
    if (this.browserWs?.readyState === WebSocket.OPEN) {
      this.browserWs.send(JSON.stringify({ type: "session_status", status }));
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade from browser
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return this.handleWebSocketUpgrade(url);
    }

    // Status endpoint
    if (url.pathname === "/status") {
      return Response.json({
        sessionId: this.sessionId,
        browserConnected: this.browserWs !== null,
        containerConnected: this.containerWs !== null,
      });
    }

    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  private handleWebSocketUpgrade(url: URL): Response {
    this.sessionId = url.searchParams.get("sessionId") ?? "default";

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept with hibernation support, storing sessionId in tags for recovery
    this.ctx.acceptWebSocket(server, [this.sessionId]);
    this.browserWs = server;

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Hibernation API: called when browser sends a message
   * DO wakes from sleep to handle this
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Restore state after hibernation - ws is the browser's WebSocket
    this.browserWs = ws;

    // Restore sessionId from WebSocket tags if lost during hibernation
    if (!this.sessionId) {
      const tags = this.ctx.getTags(ws);
      if (tags.length > 0) {
        this.sessionId = tags[0];
      }
    }

    const msg = typeof message === "string" ? message : new TextDecoder().decode(message);

    let data: {
      type: string;
      content?: string;
      sessionId?: string;
      systemPrompt?: string;
      taskId?: string;
      projectId?: string;
      requestId?: string;
      decision?: "allow" | "deny";
      modifiedInput?: Record<string, unknown>;
      answers?: Record<string, string>;
    };

    try {
      data = JSON.parse(msg);
    } catch {
      console.error("[SessionDO] Failed to parse message:", msg);
      return;
    }

    if (data.type === "start") {
      await this.startContainer(data);
    } else if (data.type === "message" && data.content) {
      // Persist user message (ordered, non-blocking)
      this.ctx.waitUntil(this.persistenceQueue.enqueue("user", data.content));

      // Forward to container
      if (this.containerWs?.readyState === WebSocket.OPEN) {
        this.containerWs.send(msg);
      } else {
        // Container has slept - queue message and restart
        console.log("[SessionDO] Container not connected, queuing message");
        this.pendingMessages.add(msg, data.type);
        await this.startContainer({ sessionId: this.sessionId ?? undefined });
      }
    } else if (data.type === "permission_response" && data.requestId) {
      this.persistPermissionExchange(data.requestId, data.decision ?? "deny", data.modifiedInput);
      this.forwardOrQueue(msg, data.type);
    } else if (data.type === "ask_user_answer" && data.requestId) {
      this.persistQuestionExchange(data.requestId, data.answers ?? {});
      this.forwardOrQueue(msg, data.type);
    } else if (this.containerWs?.readyState === WebSocket.OPEN) {
      // Forward other messages (close, etc.)
      this.containerWs.send(msg);
    }
  }

  /**
   * Hibernation API: called when browser disconnects
   */
  async webSocketClose(ws: WebSocket): Promise<void> {
    // Restore sessionId from WebSocket tags if lost during hibernation
    if (!this.sessionId) {
      const tags = this.ctx.getTags(ws);
      if (tags.length > 0) {
        this.sessionId = tags[0];
      }
    }

    console.log("[SessionDO] Browser disconnected for session:", this.sessionId);
    this.browserWs = null;

    // Force sync on disconnect to ensure data is persisted
    if (isProduction(this.env) && this.sandbox && this.sessionId) {
      this.ctx.waitUntil(
        this.syncManager.forceSync().then((result) => {
          if (!result.success) {
            console.error("[SessionDO] Force sync on disconnect failed:", result.error);
          }
        }),
      );
    }
  }

  /**
   * Hibernation API: called on WebSocket error
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    // Restore sessionId from WebSocket tags if lost during hibernation
    if (!this.sessionId) {
      const tags = this.ctx.getTags(ws);
      if (tags.length > 0) {
        this.sessionId = tags[0];
      }
    }

    console.error("[SessionDO] WebSocket error for session:", this.sessionId, error);
    this.browserWs = null;
  }

  private async startContainer(data: {
    sessionId?: string;
    systemPrompt?: string;
    content?: string;
    taskId?: string;
    projectId?: string;
  }): Promise<void> {
    const sessionId = data.sessionId ?? this.sessionId ?? "default";
    this.sessionId = sessionId;

    // Initialize persistence queue with session ID
    this.persistenceQueue.initialize(sessionId);

    console.log("[SessionDO] Starting container for session:", sessionId);

    // Send connecting status to browser
    if (this.browserWs?.readyState === WebSocket.OPEN) {
      this.browserWs.send(
        JSON.stringify({ type: "connection_status", sandboxStatus: "connecting" }),
      );
    }

    try {
      // Get sandbox instance
      this.sandbox = getSandbox(this.env.Sandbox, sessionId, {
        sleepAfter: SANDBOX_CONFIG.sleepAfter,
      });

      // Set environment variables
      await this.sandbox.setEnvVars({
        ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
        AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
        ENVIRONMENT: this.env.ENVIRONMENT ?? "development",
        API_BASE_URL: this.env.API_BASE_URL ?? "",
        INTERNAL_API_TOKEN: this.env.INTERNAL_API_TOKEN ?? "",
      });

      // Mount R2 and restore session (production)
      if (isProduction(this.env)) {
        this.sendSessionStatus("restore_started");

        const mountResult = await mountR2Bucket(this.sandbox, this.env);
        if (mountResult.success) {
          // Wait for mount to be ready (async mount may not be immediately available)
          const mountReady = await waitForMount(this.sandbox);
          if (!mountReady) {
            console.warn("[SessionDO] Mount not ready after waiting, proceeding anyway");
          }

          // Initialize sync manager with sandbox and DO storage
          this.syncManager.initialize(this.sandbox, sessionId, this.ctx.storage);

          // Attempt recovery from previous failed sync
          const recovered = await this.syncManager.attemptRecovery();
          if (recovered) {
            this.sendSessionStatus("sync_recovered");
          }

          this.sendSessionStatus("restoring");
          const restoreStatus = await restoreSessionFromR2(this.sandbox, sessionId);
          console.log("[SessionDO] Session restore status:", restoreStatus);

          // Map RestoreStatus to user-friendly status
          const statusMap: Record<string, string> = {
            RESTORED: "restored",
            NO_R2_DATA: "restore_skipped",
            RESTORE_RSYNC_FAILED: "restore_failed",
            RESTORE_VERIFY_FAILED: "restore_failed",
          };
          this.sendSessionStatus(statusMap[restoreStatus] ?? restoreStatus);
        } else {
          console.warn("[SessionDO] R2 mount failed:", mountResult);
          this.sendSessionStatus("restore_failed");
        }
      } else {
        // Development mode - skip restoration
        this.sendSessionStatus("restore_skipped");
      }

      // Start container process
      const process = await this.sandbox.startProcess(CONTAINER_CONFIG.entrypoint);
      await process.waitForPort(CONTAINER_CONFIG.port, {
        timeout: CONTAINER_CONFIG.startTimeout,
        path: CONTAINER_CONFIG.healthPath,
      });

      console.log("[SessionDO] Container ready, connecting via wsConnect");

      // Create synthetic WebSocket upgrade request
      const wsUpgradeRequest = new Request("https://internal/ws", {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      // Connect through Sandbox SDK routing layer (not localhost TCP)
      const wsResponse = await this.sandbox.wsConnect(wsUpgradeRequest, CONTAINER_CONFIG.port);

      // Get WebSocket from response
      const ws = wsResponse.webSocket;
      if (!ws) {
        throw new Error("Container didn't accept WebSocket connection");
      }

      // Accept the WebSocket to handle it in this DO
      ws.accept();
      this.containerWs = ws;

      console.log("[SessionDO] Connected to container WebSocket");

      // Send connected status to browser
      if (this.browserWs?.readyState === WebSocket.OPEN) {
        this.browserWs.send(
          JSON.stringify({ type: "connection_status", sandboxStatus: "connected" }),
        );
      }

      // Check for pending questions/permissions and inject "continue" into start message
      const startData = await this.injectAutoContinue(data);

      // Forward start message to container
      this.containerWs.send(JSON.stringify(startData));

      // Drain any pending messages that triggered reconnection
      await this.drainPendingMessages();

      this.containerWs.addEventListener("message", async (event) => {
        await this.handleContainerMessage(event.data as string);
      });

      this.containerWs.addEventListener("close", (event: CloseEvent) => {
        console.log("[SessionDO] Container WebSocket closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        // Send disconnected status to browser with details
        if (this.browserWs?.readyState === WebSocket.OPEN) {
          this.browserWs.send(
            JSON.stringify({ type: "connection_status", sandboxStatus: "disconnected" }),
          );
          // Send close reason if available
          if (event.code !== 1000 || event.reason) {
            this.browserWs.send(
              JSON.stringify({
                type: "error",
                message: `Container closed: code=${event.code}, reason=${event.reason || "none"}`,
              }),
            );
          }
        }
        this.containerWs = null;
      });

      this.containerWs.addEventListener("error", (event: ErrorEvent) => {
        const errorDetails = {
          message: event.message || "no message",
          filename: event.filename || "unknown",
          lineno: event.lineno,
          colno: event.colno,
          error:
            event.error instanceof Error
              ? { name: event.error.name, message: event.error.message }
              : String(event.error),
        };
        console.error("[SessionDO] Container WebSocket error:", errorDetails);
        // Send error to browser
        if (this.browserWs?.readyState === WebSocket.OPEN) {
          this.browserWs.send(
            JSON.stringify({
              type: "error",
              message: `Container WebSocket error: ${errorDetails.message}`,
            }),
          );
        }
      });

      // Keep DO alive while container is connected (prevents hibernation from dropping messages)
      const containerLifecycle = new Promise<void>((resolve) => {
        this.containerWs?.addEventListener("close", () => resolve());
        this.containerWs?.addEventListener("error", () => resolve());
      });
      this.ctx.waitUntil(containerLifecycle);
    } catch (error) {
      console.error("[SessionDO] Failed to start container:", error);
      // Send error to browser
      if (this.browserWs?.readyState === WebSocket.OPEN) {
        this.browserWs.send(
          JSON.stringify({ type: "connection_status", sandboxStatus: "disconnected" }),
        );
        this.browserWs.send(
          JSON.stringify({
            type: "error",
            message: error instanceof Error ? error.message : "Failed to start container",
          }),
        );
      }
    }
  }

  /**
   * If there are pending questions/permissions from a previous session,
   * inject content: "continue" into the start data so the resumed SDK re-asks.
   * The content is processed by handleStart after session setup, avoiding race conditions.
   */
  private async injectAutoContinue<T extends { content?: string }>(data: T): Promise<T> {
    // Restore pending state from DO storage if maps are empty (DO was evicted)
    if (this.pendingQuestions.size === 0 && this.pendingPermissions.size === 0) {
      const [storedQuestions, storedPermissions] = await Promise.all([
        this.ctx.storage.get<QuestionRequestData[]>("pendingQuestions"),
        this.ctx.storage.get<PermissionRequestData[]>("pendingPermissions"),
      ]);
      if (storedQuestions) {
        for (const q of storedQuestions) this.pendingQuestions.set(q.requestId, q);
      }
      if (storedPermissions) {
        for (const p of storedPermissions) this.pendingPermissions.set(p.requestId, p);
      }
    }

    const hasPending = this.pendingQuestions.size > 0 || this.pendingPermissions.size > 0;
    if (hasPending) {
      console.log("[SessionDO] Injecting auto-continue for pending questions/permissions");
      // Clear stale entries — new requestIds will be generated by resumed session
      this.pendingQuestions.clear();
      this.pendingPermissions.clear();
      this.ctx.waitUntil(
        Promise.all([
          this.ctx.storage.delete("pendingQuestions"),
          this.ctx.storage.delete("pendingPermissions"),
        ]),
      );
      return { ...data, content: "continue" };
    }

    return data;
  }

  /**
   * Drain all pending messages to the container
   */
  private async drainPendingMessages(): Promise<void> {
    if (!this.containerWs || this.containerWs.readyState !== WebSocket.OPEN) {
      return;
    }

    const pending = this.pendingMessages.drain();
    if (pending.length > 0) {
      console.log(`[SessionDO] Draining ${pending.length} pending messages`);
      for (const msg of pending) {
        this.containerWs.send(msg.raw);
      }
    }
  }

  private async handleContainerMessage(msg: string): Promise<void> {
    interface SDKMessageData {
      type: string;
      message?: {
        type: string;
        message?: {
          content?: Array<{ type: string; text?: string }>;
        };
      };
      metadata?: {
        tokensUsed?: number;
        stopReason?: string;
      };
      requestId?: string;
      toolName?: string;
      toolInput?: Record<string, unknown>;
      questions?: QuestionRequestData["questions"];
    }

    let data: SDKMessageData;

    try {
      data = JSON.parse(msg);
    } catch {
      // Forward non-JSON messages as-is
      if (this.browserWs?.readyState === WebSocket.OPEN) {
        this.browserWs.send(msg);
      }
      return;
    }

    // Extract text from sdk_message for accumulation (for DB persistence)
    if (data.type === "sdk_message" && data.message?.type === "assistant") {
      const content = data.message.message?.content;
      if (Array.isArray(content)) {
        const textContent = content
          .filter((block): block is { type: "text"; text: string } => block.type === "text")
          .map((block) => block.text)
          .join("");
        this.assistantContent += textContent;
      }
    }

    // On completion, persist accumulated content and include messageId in response
    if (data.type === "done") {
      if (this.assistantContent) {
        // Persist assistant message (ordered, with retry)
        const messageId = await this.persistenceQueue.enqueue(
          "assistant",
          this.assistantContent,
          data.metadata,
        );

        // Forward done message with messageId
        if (this.browserWs?.readyState === WebSocket.OPEN) {
          this.browserWs.send(
            JSON.stringify({
              type: "done",
              messageId,
              metadata: data.metadata,
            }),
          );
        }
      } else {
        // No content to persist, forward as-is
        if (this.browserWs?.readyState === WebSocket.OPEN) {
          this.browserWs.send(msg);
        }
      }

      // Request sync (debounced, non-blocking, production only)
      if (isProduction(this.env) && this.sandbox && this.sessionId) {
        this.ctx.waitUntil(
          this.syncManager.requestSync().then((result) => {
            if (!result.success) {
              console.error("[SessionDO] Sync failed:", result.error);
            }
          }),
        );
      }

      // Reset for next message
      this.assistantContent = "";
      return;
    }

    // Store pending permission/question requests for persistence on response
    if (data.type === "tool_permission_request" && data.requestId) {
      this.pendingPermissions.set(data.requestId, {
        requestId: data.requestId,
        toolName: data.toolName ?? "",
        toolInput: data.toolInput ?? {},
      });
      this.ctx.waitUntil(
        this.ctx.storage.put("pendingPermissions", [...this.pendingPermissions.values()]),
      );
    } else if (data.type === "ask_user_question" && data.requestId) {
      this.pendingQuestions.set(data.requestId, {
        requestId: data.requestId,
        questions: data.questions ?? [],
      });
      this.ctx.waitUntil(
        this.ctx.storage.put("pendingQuestions", [...this.pendingQuestions.values()]),
      );
    }

    // Forward all other messages to browser (including sdk_message)
    if (this.browserWs?.readyState === WebSocket.OPEN) {
      this.browserWs.send(msg);
    }
  }

  private persistPermissionExchange(
    requestId: string,
    decision: "allow" | "deny",
    modifiedInput?: Record<string, unknown>,
  ): void {
    const request = this.pendingPermissions.get(requestId);
    if (request) {
      const requestContent = JSON.stringify(request);
      const responseContent = JSON.stringify({ requestId, decision, modifiedInput });
      this.ctx.waitUntil(
        this.persistenceQueue
          .enqueue("assistant", requestContent, undefined, "permission_request")
          .then(() =>
            this.persistenceQueue.enqueue(
              "user",
              responseContent,
              undefined,
              "permission_response",
            ),
          ),
      );
      this.pendingPermissions.delete(requestId);
      this.ctx.waitUntil(
        this.ctx.storage.put("pendingPermissions", [...this.pendingPermissions.values()]),
      );
    }
  }

  private persistQuestionExchange(requestId: string, answers: Record<string, string>): void {
    const question = this.pendingQuestions.get(requestId);
    if (question) {
      const questionContent = JSON.stringify(question);
      const answerContent = JSON.stringify({ requestId, answers });
      this.ctx.waitUntil(
        this.persistenceQueue
          .enqueue("assistant", questionContent, undefined, "question")
          .then(() =>
            this.persistenceQueue.enqueue("user", answerContent, undefined, "question_answer"),
          ),
      );
      this.pendingQuestions.delete(requestId);
      this.ctx.waitUntil(
        this.ctx.storage.put("pendingQuestions", [...this.pendingQuestions.values()]),
      );
    }
  }

  private async forwardOrQueue(msg: string, type: string): Promise<void> {
    if (this.containerWs?.readyState === WebSocket.OPEN) {
      this.containerWs.send(msg);
    } else {
      console.log("[SessionDO] Container not connected, queuing:", type);
      this.pendingMessages.add(msg, type);
      await this.startContainer({ sessionId: this.sessionId ?? undefined });
    }
  }
}
