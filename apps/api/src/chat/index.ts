import type { Database } from "@repo/db";
import type { MiddlewareHandler } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import { createChatHandlers } from "./handlers.js";
import { ChatRepository } from "./repositories/chat.repository.js";
import { createChatRoutes } from "./routes.js";
import { ChatService } from "./services/chat.service.js";
import { createWebSocketHandler } from "./websocket.js";

export function createChatModule(
  db: Database,
  upgradeWebSocket: UpgradeWebSocket,
  authMiddleware: MiddlewareHandler,
) {
  // Create instances with dependencies
  const repository = new ChatRepository(db);
  const chatService = new ChatService(repository);
  const handlers = createChatHandlers(chatService);
  const wsHandler = createWebSocketHandler(chatService);

  // Create routes with all dependencies
  const routes = createChatRoutes(
    handlers,
    wsHandler,
    chatService,
    upgradeWebSocket,
    authMiddleware,
  );

  return {
    routes,
    chatService,
  };
}

export type ChatModule = ReturnType<typeof createChatModule>;
