import type { MiddlewareHandler } from "hono";
import { factory } from "../shared/factory.js";
import type { TaskRunHandlers } from "./handlers.js";

export function createTaskRunRoutes(handlers: TaskRunHandlers, authMiddleware: MiddlewareHandler) {
  return factory
    .createApp()
    .use("*", authMiddleware)
    .post("/:projectId/tasks/:taskId/runs", ...handlers.triggerRun)
    .get("/:projectId/tasks/:taskId/runs", ...handlers.listRuns)
    .get("/:projectId/tasks/:taskId/runs/:runId", ...handlers.getRun);
}
