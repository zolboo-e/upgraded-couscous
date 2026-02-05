import { sValidator } from "@hono/standard-validator";
import { Hono, type MiddlewareHandler } from "hono";
import type { ChatHandlers } from "./handlers.js";
import { createSessionSchema, sessionIdSchema } from "./types/request.types.js";

export function createChatRoutes(handlers: ChatHandlers, authMiddleware: MiddlewareHandler) {
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
    );
}
