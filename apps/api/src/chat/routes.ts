import type { MiddlewareHandler } from "hono";
import { factory } from "../shared/factory.js";
import type { ChatHandlers } from "./handlers.js";

export function createChatRoutes(handlers: ChatHandlers, authMiddleware: MiddlewareHandler) {
  return factory
    .createApp()
    .post("/sessions", authMiddleware, ...handlers.createSession)
    .get("/sessions", authMiddleware, ...handlers.listSessions)
    .get("/sessions/task/:taskId", authMiddleware, ...handlers.getTaskSession)
    .get("/sessions/:id", authMiddleware, ...handlers.getSession)
    .delete("/sessions/:id", authMiddleware, ...handlers.deleteSession);
}
