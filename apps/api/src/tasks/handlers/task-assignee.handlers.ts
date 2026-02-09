import { sValidator } from "@hono/standard-validator";
import { factory } from "../../shared/factory.js";
import type { TaskAssigneeService } from "../services/task-assignee.service.js";
import { taskParamsSchema } from "../types/request.types.js";
import { addAssigneeSchema, assigneeParamsSchema } from "../types/task-assignee.types.js";

export function createTaskAssigneeHandlers(assigneeService: TaskAssigneeService) {
  return {
    getAssignees: factory.createHandlers(sValidator("param", taskParamsSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId, taskId } = c.req.valid("param");
      const result = await assigneeService.getAssignees(userId, projectId, taskId);
      return c.json({ data: result });
    }),

    addAssignee: factory.createHandlers(
      sValidator("param", taskParamsSchema),
      sValidator("json", addAssigneeSchema),
      async (c) => {
        const userId = c.get("userId");
        const { projectId, taskId } = c.req.valid("param");
        const { userId: assigneeUserId } = c.req.valid("json");
        await assigneeService.addAssignee(userId, projectId, taskId, assigneeUserId);
        return c.json({ data: { success: true } }, 201);
      },
    ),

    removeAssignee: factory.createHandlers(sValidator("param", assigneeParamsSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId, taskId, userId: assigneeUserId } = c.req.valid("param");
      await assigneeService.removeAssignee(userId, projectId, taskId, assigneeUserId);
      return c.json({ data: { success: true } });
    }),
  };
}

export type TaskAssigneeHandlers = ReturnType<typeof createTaskAssigneeHandlers>;
