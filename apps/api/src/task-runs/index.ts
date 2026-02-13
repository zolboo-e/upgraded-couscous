import type { Database } from "@repo/db";
import type { MiddlewareHandler } from "hono";
import { env } from "../config/env.js";
import { ProjectRepository } from "../projects/repositories/project.repository.js";
import { TaskRepository } from "../tasks/repositories/task.repository.js";
import { createTaskRunHandlers } from "./handlers.js";
import { TaskRunRepository } from "./repositories/task-run.repository.js";
import { createTaskRunRoutes } from "./routes.js";
import { createSandboxClient } from "./services/sandbox-client.js";
import { TaskRunService } from "./services/task-run.service.js";

export function createTaskRunsModule(db: Database, authMiddleware: MiddlewareHandler) {
  const taskRunRepository = new TaskRunRepository(db);
  const taskRepository = new TaskRepository(db);
  const projectRepository = new ProjectRepository(db);

  const sandboxClient = createSandboxClient(
    env.SANDBOX_WS_URL ?? "",
    env.SANDBOX_API_TOKEN ?? "",
    env.INTERNAL_API_TOKEN ?? "",
  );

  const taskRunService = new TaskRunService(
    taskRunRepository,
    taskRepository,
    projectRepository,
    sandboxClient,
  );

  const handlers = createTaskRunHandlers(taskRunService);
  const routes = createTaskRunRoutes(handlers, authMiddleware);

  return { routes, taskRunService, taskRunRepository };
}

export type TaskRunsModule = ReturnType<typeof createTaskRunsModule>;
