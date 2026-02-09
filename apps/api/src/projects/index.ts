import type { Database } from "@repo/db";
import type { MiddlewareHandler } from "hono";
import { ChatRepository } from "../chat/repositories/chat.repository.js";
import { createProjectHandlers } from "./handlers.js";
import { ProjectRepository } from "./repositories/project.repository.js";
import { createProjectRoutes } from "./routes.js";
import { ProjectService } from "./services/project.service.js";

export function createProjectsModule(db: Database, authMiddleware: MiddlewareHandler) {
  const repository = new ProjectRepository(db);
  const chatRepository = new ChatRepository(db);
  const projectService = new ProjectService(repository, chatRepository);
  const handlers = createProjectHandlers(projectService);
  const routes = createProjectRoutes(handlers, authMiddleware);

  return {
    routes,
    projectService,
  };
}

export type ProjectsModule = ReturnType<typeof createProjectsModule>;
