import type { Database } from "@repo/db";
import type { MiddlewareHandler } from "hono";
import { createChatHandlers } from "./handlers.js";
import { ChatRepository } from "./repositories/chat.repository.js";
import { createChatRoutes } from "./routes.js";
import { ChatService } from "./services/chat.service.js";

export function createChatModule(db: Database, authMiddleware: MiddlewareHandler) {
  // Create instances with dependencies
  const repository = new ChatRepository(db);
  const chatService = new ChatService(repository);
  const handlers = createChatHandlers(chatService);

  // Create routes with all dependencies
  const routes = createChatRoutes(handlers, authMiddleware);

  return {
    routes,
    chatService,
  };
}

export type ChatModule = ReturnType<typeof createChatModule>;
