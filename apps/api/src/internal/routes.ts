import { Hono } from "hono";
import type { InternalHandlers } from "./handlers.js";
import { internalAuthMiddleware } from "./middleware.js";

export function createInternalRoutes(handlers: InternalHandlers): Hono {
  const internal = new Hono();

  // All internal routes require service token
  internal.use("*", internalAuthMiddleware);

  // POST /internal/sessions/:sessionId/messages - Save a message
  internal.post("/sessions/:sessionId/messages", handlers.saveMessage);

  // PATCH /internal/tasks/:taskId - Update a task (from agent)
  internal.patch("/tasks/:taskId", handlers.updateTask);

  return internal;
}
