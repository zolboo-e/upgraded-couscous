import type { Database } from "@repo/db";
import { ChatRepository } from "../chat/repositories/chat.repository.js";
import { ChatService } from "../chat/services/chat.service.js";
import { TaskRunRepository } from "../task-runs/repositories/task-run.repository.js";
import { TaskRepository } from "../tasks/repositories/task.repository.js";
import { createInternalHandlers } from "./handlers.js";
import { createInternalRoutes } from "./routes.js";

export function createInternalModule(db: Database) {
  const chatRepository = new ChatRepository(db);
  const chatService = new ChatService(chatRepository);
  const taskRepository = new TaskRepository(db);
  const taskRunRepository = new TaskRunRepository(db);
  const handlers = createInternalHandlers(chatService, taskRepository, taskRunRepository);
  const routes = createInternalRoutes(handlers);

  return { routes };
}
