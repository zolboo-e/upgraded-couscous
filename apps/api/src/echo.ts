import { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import WebSocket from "ws";
import type { env as envType } from "./config/env.js";

type Env = typeof envType;

export function createEchoRoutes(env: Env, upgradeWebSocket: UpgradeWebSocket): Hono {
  const echo = new Hono();

  echo.get(
    "/",
    upgradeWebSocket((c) => {
      const clientSessionId = c.req.query("sessionId");
      let sandboxWs: WebSocket | null = null;

      return {
        onOpen: (_evt, ws) => {
          if (!env.SANDBOX_WS_URL || !env.SANDBOX_API_TOKEN) {
            console.error("[echo] Sandbox not configured");
            ws.close(1011, "Sandbox not configured");
            return;
          }

          // Build sandbox URL with sessionId
          const sandboxUrl = new URL(env.SANDBOX_WS_URL.replace(/\/ws$/, "/echo"));
          if (clientSessionId) {
            sandboxUrl.searchParams.set("sessionId", clientSessionId);
          }
          console.log("[echo] Connecting to sandbox:", sandboxUrl.toString());

          sandboxWs = new WebSocket(sandboxUrl.toString(), {
            headers: { Authorization: `Bearer ${env.SANDBOX_API_TOKEN}` },
          });

          sandboxWs.on("open", () => {
            console.log("[echo] Connected to sandbox");
          });

          sandboxWs.on("message", (data) => {
            const message = data.toString();
            console.log("[echo] IN (from sandbox):", message);
            ws.send(message);
            console.log("[echo] OUT (to client):", message);
          });

          sandboxWs.on("close", () => {
            console.log("[echo] Sandbox connection closed");
            ws.close();
          });

          sandboxWs.on("error", (error) => {
            console.error("[echo] Sandbox error:", error.message);
            ws.close(1011, "Sandbox error");
          });
        },

        onMessage: (evt, _ws) => {
          const data = typeof evt.data === "string" ? evt.data : evt.data.toString();
          console.log("[echo] IN (from client):", data);
          if (sandboxWs?.readyState === WebSocket.OPEN) {
            sandboxWs.send(data);
            console.log("[echo] OUT (to sandbox):", data);
          }
        },

        onClose: () => {
          console.log("[echo] Client disconnected");
          sandboxWs?.close();
        },
      };
    }),
  );

  return echo;
}
