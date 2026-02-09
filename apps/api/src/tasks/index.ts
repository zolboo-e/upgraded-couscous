import type { Database } from "@repo/db";
import type { MiddlewareHandler } from "hono";
import { ChatRepository } from "../chat/repositories/chat.repository.js";
import { ProjectRepository } from "../projects/repositories/project.repository.js";
import { createTaskAssigneeHandlers } from "./handlers/task-assignee.handlers.js";
import { createTaskHandlers } from "./handlers.js";
import { TaskRepository } from "./repositories/task.repository.js";
import { TaskAssigneeRepository } from "./repositories/task-assignee.repository.js";
import { createTaskRoutes } from "./routes.js";
import { TaskService } from "./services/task.service.js";
import { TaskAssigneeService } from "./services/task-assignee.service.js";

export function createTasksModule(db: Database, authMiddleware: MiddlewareHandler) {
  const taskRepository = new TaskRepository(db);
  const projectRepository = new ProjectRepository(db);
  const chatRepository = new ChatRepository(db);
  const assigneeRepository = new TaskAssigneeRepository(db);

  const taskService = new TaskService(taskRepository, projectRepository, chatRepository);
  const assigneeService = new TaskAssigneeService(
    assigneeRepository,
    taskRepository,
    projectRepository,
  );

  const handlers = createTaskHandlers(taskService);
  const assigneeHandlers = createTaskAssigneeHandlers(assigneeService);
  const routes = createTaskRoutes(handlers, assigneeHandlers, authMiddleware);

  return {
    routes,
    taskService,
    assigneeService,
  };
}

export type TasksModule = ReturnType<typeof createTasksModule>;
