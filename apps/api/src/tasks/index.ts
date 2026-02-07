import type { Database } from "@repo/db";
import type { MiddlewareHandler } from "hono";
import { ProjectRepository } from "../projects/repositories/project.repository.js";
import { createTaskHandlers } from "./handlers.js";
import { TaskRepository } from "./repositories/task.repository.js";
import { createTaskRoutes } from "./routes.js";
import { TaskService } from "./services/task.service.js";

export function createTasksModule(db: Database, authMiddleware: MiddlewareHandler) {
  const taskRepository = new TaskRepository(db);
  const projectRepository = new ProjectRepository(db);
  const taskService = new TaskService(taskRepository, projectRepository);
  const handlers = createTaskHandlers(taskService);
  const routes = createTaskRoutes(handlers, authMiddleware);

  return {
    routes,
    taskService,
  };
}

export type TasksModule = ReturnType<typeof createTasksModule>;
