import type { MiddlewareHandler } from "hono";
import { factory } from "../shared/factory.js";
import type { TaskHandlers } from "./handlers.js";

export function createTaskRoutes(handlers: TaskHandlers, authMiddleware: MiddlewareHandler) {
  return factory
    .createApp()
    .use("*", authMiddleware)
    .get("/:projectId/tasks", ...handlers.getTasks)
    .post("/:projectId/tasks", ...handlers.createTask)
    .patch("/:projectId/tasks/:taskId", ...handlers.updateTask)
    .delete("/:projectId/tasks/:taskId", ...handlers.deleteTask);
}
