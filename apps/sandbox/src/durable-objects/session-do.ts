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
import { mountR2Bucket, restoreSessionFromR2 } from "../services/r2-sync.js";

export class SessionDO extends DurableObject<Env> {
  private browserWs: WebSocket | null = null;
  private containerWs: WebSocket | null = null;
  private sandbox: Sandbox | null = null;
  private sessionId: string | null = null;

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

    // Accept with hibernation support
    this.ctx.acceptWebSocket(server);
    this.browserWs = server;

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Hibernation API: called when browser sends a message
   * DO wakes from sleep to handle this
   */
  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const msg = typeof message === "string" ? message : new TextDecoder().decode(message);

    let data: {
      type: string;
      content?: string;
      sessionId?: string;
      systemPrompt?: string;
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
      // Persist user message
      await this.persistMessage("user", data.content);
      // Forward to container
      if (this.containerWs?.readyState === WebSocket.OPEN) {
        this.containerWs.send(msg);
      }
    } else if (this.containerWs?.readyState === WebSocket.OPEN) {
      // Forward other messages (permission responses, close, etc.)
      this.containerWs.send(msg);
    }
  }

  /**
   * Hibernation API: called when browser disconnects
   */
  async webSocketClose(_ws: WebSocket): Promise<void> {
    console.log("[SessionDO] Browser disconnected for session:", this.sessionId);
    this.browserWs = null;
    // Container will go idle via sleepAfter, no need to close explicitly
  }

  /**
   * Hibernation API: called on WebSocket error
   */
  async webSocketError(_ws: WebSocket, error: unknown): Promise<void> {
    console.error("[SessionDO] WebSocket error:", error);
    this.browserWs = null;
  }

  private async startContainer(data: {
    sessionId?: string;
    systemPrompt?: string;
    content?: string;
  }): Promise<void> {
    const sessionId = data.sessionId ?? this.sessionId ?? "default";
    this.sessionId = sessionId;

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
      });

      // Mount R2 and restore session (production)
      if (isProduction(this.env)) {
        const mountResult = await mountR2Bucket(this.sandbox, this.env);
        if (mountResult.success) {
          const restoreStatus = await restoreSessionFromR2(this.sandbox, sessionId);
          console.log("[SessionDO] Session restore status:", restoreStatus);
        } else {
          console.warn("[SessionDO] R2 mount failed:", mountResult);
        }
      }

      // Start container process
      const process = await this.sandbox.startProcess(CONTAINER_CONFIG.entrypoint);
      await process.waitForPort(CONTAINER_CONFIG.port, {
        timeout: CONTAINER_CONFIG.startTimeout,
        path: CONTAINER_CONFIG.healthPath,
      });

      console.log("[SessionDO] Container ready, connecting WebSocket");

      // Connect to container WebSocket as client
      this.containerWs = new WebSocket(`ws://127.0.0.1:${CONTAINER_CONFIG.port}`);

      this.containerWs.addEventListener("open", () => {
        console.log("[SessionDO] Connected to container WebSocket");
        // Send connected status to browser
        if (this.browserWs?.readyState === WebSocket.OPEN) {
          this.browserWs.send(
            JSON.stringify({ type: "connection_status", sandboxStatus: "connected" }),
          );
        }
        // Forward start message to container
        this.containerWs?.send(JSON.stringify(data));
      });

      this.containerWs.addEventListener("message", async (event) => {
        await this.handleContainerMessage(event.data as string);
      });

      this.containerWs.addEventListener("close", () => {
        console.log("[SessionDO] Container WebSocket closed");
        // Send disconnected status to browser
        if (this.browserWs?.readyState === WebSocket.OPEN) {
          this.browserWs.send(
            JSON.stringify({ type: "connection_status", sandboxStatus: "disconnected" }),
          );
        }
        this.containerWs = null;
      });

      this.containerWs.addEventListener("error", (event) => {
        console.error("[SessionDO] Container WebSocket error:", event);
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

  private async handleContainerMessage(msg: string): Promise<void> {
    let data: {
      type: string;
      content?: string;
      metadata?: {
        tokensUsed?: number;
        stopReason?: string;
      };
    };

    try {
      data = JSON.parse(msg);
    } catch {
      // Forward non-JSON messages as-is
      if (this.browserWs?.readyState === WebSocket.OPEN) {
        this.browserWs.send(msg);
      }
      return;
    }

    // Persist assistant message on completion
    if (data.type === "done" && data.content) {
      await this.persistMessage("assistant", data.content, data.metadata);
    }

    // Forward to browser
    if (this.browserWs?.readyState === WebSocket.OPEN) {
      this.browserWs.send(msg);
    }
  }

  /**
   * Persist message to API via internal endpoint
   */
  private async persistMessage(
    role: "user" | "assistant",
    content: string,
    metadata?: { tokensUsed?: number; stopReason?: string },
  ): Promise<void> {
    if (!this.env.API_BASE_URL || !this.env.INTERNAL_API_TOKEN) {
      console.warn("[SessionDO] API persistence not configured, skipping");
      return;
    }

    try {
      const response = await fetch(
        `${this.env.API_BASE_URL}/internal/sessions/${this.sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Token": this.env.INTERNAL_API_TOKEN,
          },
          body: JSON.stringify({ role, type: "message", content, metadata }),
        },
      );

      if (!response.ok) {
        console.error("[SessionDO] Failed to persist message:", response.status);
      }
    } catch (error) {
      console.error("[SessionDO] Failed to persist message:", error);
    }
  }
}
