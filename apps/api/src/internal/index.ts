import type { Database } from "@repo/db";
import { ChatRepository } from "../chat/repositories/chat.repository.js";
import { ChatService } from "../chat/services/chat.service.js";
import { createInternalHandlers } from "./handlers.js";
import { createInternalRoutes } from "./routes.js";

export function createInternalModule(db: Database) {
  const chatRepository = new ChatRepository(db);
  const chatService = new ChatService(chatRepository);
  const handlers = createInternalHandlers(chatService);
  const routes = createInternalRoutes(handlers);

  return { routes };
}
