import { sValidator } from "@hono/standard-validator";
import { Hono, type MiddlewareHandler } from "hono";
import type { UpgradeWebSocket, WSContext } from "hono/ws";
import type { ChatHandlers } from "./handlers.js";
import type { ChatService } from "./services/chat.service.js";
import { createSessionSchema, sessionIdSchema } from "./types/request.types.js";
import type { WebSocketHandler } from "./websocket.js";

export function createChatRoutes(
  handlers: ChatHandlers,
  wsHandler: WebSocketHandler,
  chatService: ChatService,
  upgradeWebSocket: UpgradeWebSocket,
  authMiddleware: MiddlewareHandler,
) {
  // Chain all routes - this preserves type inference for RPC
  // Apply auth middleware per-route instead of use("*", ...)
  return new Hono()
    .post(
      "/sessions",
      authMiddleware,
      sValidator("json", createSessionSchema),
      handlers.createSession,
    )
    .get("/sessions", authMiddleware, handlers.listSessions)
    .get("/sessions/:id", authMiddleware, sValidator("param", sessionIdSchema), handlers.getSession)
    .delete(
      "/sessions/:id",
      authMiddleware,
      sValidator("param", sessionIdSchema),
      handlers.deleteSession,
    )
    .get(
      "/sessions/:id/ws",
      authMiddleware,
      sValidator("param", sessionIdSchema),
      upgradeWebSocket((c) => {
        const userId = c.get("userId");
        const sessionId = c.req.param("id");

        let wsState: Awaited<ReturnType<typeof wsHandler.onOpen>> | null = null;

        return {
          onOpen: async (_evt, ws) => {
            // Send connecting status immediately so frontend shows progress
            ws.send(JSON.stringify({ type: "connection_status", sandboxStatus: "connecting" }));

            try {
              const session = await chatService.getSession(userId, sessionId);
              wsState = await wsHandler.onOpen(
                ws as unknown as WSContext,
                session,
                session.messages,
                userId,
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Failed to initialize session";
              // Send disconnected status so frontend knows connection failed
              ws.send(JSON.stringify({ type: "connection_status", sandboxStatus: "disconnected" }));
              ws.send(JSON.stringify({ type: "error", message }));
              ws.close(1008, message);
            }
          },

          onMessage: async (evt, ws) => {
            if (!wsState) return;

            const data = typeof evt.data === "string" ? evt.data : evt.data.toString();
            await wsHandler.onMessage(ws as unknown as WSContext, wsState, chatService, data);
          },

          onClose: () => {
            if (wsState) {
              wsHandler.onClose(wsState);
            }
          },

          onError: (evt) => {
            console.error("WebSocket error:", evt);
          },
        };
      }),
    );
}
