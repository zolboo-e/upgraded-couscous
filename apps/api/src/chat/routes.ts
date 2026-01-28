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
): Hono {
  const chat = new Hono();

  // Apply auth middleware to all chat routes
  chat.use("*", authMiddleware);

  // Session CRUD routes
  chat.post("/sessions", sValidator("json", createSessionSchema), handlers.createSession);

  chat.get("/sessions", handlers.listSessions);

  chat.get("/sessions/:id", sValidator("param", sessionIdSchema), handlers.getSession);

  chat.delete("/sessions/:id", sValidator("param", sessionIdSchema), handlers.deleteSession);

  // WebSocket route for real-time chat
  chat.get(
    "/sessions/:id/ws",
    sValidator("param", sessionIdSchema),
    upgradeWebSocket((c) => {
      const userId = c.get("userId");
      const sessionId = c.req.param("id");

      let wsState: Awaited<ReturnType<typeof wsHandler.onOpen>> | null = null;

      return {
        onOpen: async (_evt, ws) => {
          try {
            const session = await chatService.getSession(userId, sessionId);
            wsState = await wsHandler.onOpen(
              ws as unknown as WSContext,
              session,
              session.messages,
              userId,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to initialize session";
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

  return chat;
}
