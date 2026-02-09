import type { MiddlewareHandler } from "hono";
import { factory } from "../shared/factory.js";
import type { TaskAssigneeHandlers } from "./handlers/task-assignee.handlers.js";
import type { TaskHandlers } from "./handlers.js";

export function createTaskRoutes(
  handlers: TaskHandlers,
  assigneeHandlers: TaskAssigneeHandlers,
  authMiddleware: MiddlewareHandler,
) {
  return factory
    .createApp()
    .use("*", authMiddleware)
    .get("/:projectId/tasks", ...handlers.getTasks)
    .get("/:projectId/tasks/:taskId", ...handlers.getTask)
    .post("/:projectId/tasks", ...handlers.createTask)
    .patch("/:projectId/tasks/:taskId", ...handlers.updateTask)
    .delete("/:projectId/tasks/:taskId", ...handlers.deleteTask)
    .get("/:projectId/tasks/:taskId/assignees", ...assigneeHandlers.getAssignees)
    .post("/:projectId/tasks/:taskId/assignees", ...assigneeHandlers.addAssignee)
    .delete("/:projectId/tasks/:taskId/assignees/:userId", ...assigneeHandlers.removeAssignee);
}
