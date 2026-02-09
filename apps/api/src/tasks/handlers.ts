import { sValidator } from "@hono/standard-validator";
import { factory } from "../shared/factory.js";
import type { TaskService } from "./services/task.service.js";
import {
  createTaskSchema,
  projectIdParamSchema,
  taskParamsSchema,
  updateTaskSchema,
} from "./types/request.types.js";

export function createTaskHandlers(taskService: TaskService) {
  return {
    getTasks: factory.createHandlers(sValidator("param", projectIdParamSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId } = c.req.valid("param");
      const result = await taskService.getTasks(userId, projectId);
      return c.json({ data: result });
    }),

    getTask: factory.createHandlers(sValidator("param", taskParamsSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId, taskId } = c.req.valid("param");
      const result = await taskService.getTask(userId, projectId, taskId);
      return c.json({ data: result });
    }),

    createTask: factory.createHandlers(
      sValidator("param", projectIdParamSchema),
      sValidator("json", createTaskSchema),
      async (c) => {
        const userId = c.get("userId");
        const { projectId } = c.req.valid("param");
        const input = c.req.valid("json");
        const result = await taskService.createTask(userId, projectId, input);
        return c.json({ data: result }, 201);
      },
    ),

    updateTask: factory.createHandlers(
      sValidator("param", taskParamsSchema),
      sValidator("json", updateTaskSchema),
      async (c) => {
        const userId = c.get("userId");
        const { projectId, taskId } = c.req.valid("param");
        const input = c.req.valid("json");
        const result = await taskService.updateTask(userId, projectId, taskId, input);
        return c.json({ data: result });
      },
    ),

    deleteTask: factory.createHandlers(sValidator("param", taskParamsSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId, taskId } = c.req.valid("param");
      await taskService.deleteTask(userId, projectId, taskId);
      return c.json({ data: { success: true } });
    }),
  };
}

export type TaskHandlers = ReturnType<typeof createTaskHandlers>;
