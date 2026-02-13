import { sValidator } from "@hono/standard-validator";
import { factory } from "../shared/factory.js";
import type { TaskRunService } from "./services/task-run.service.js";
import { taskRunParamsSchema, taskRunWithIdParamsSchema } from "./types/request.types.js";

export function createTaskRunHandlers(taskRunService: TaskRunService) {
  return {
    triggerRun: factory.createHandlers(sValidator("param", taskRunParamsSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId, taskId } = c.req.valid("param");
      const result = await taskRunService.triggerRun(userId, projectId, taskId);
      return c.json({ data: result }, 201);
    }),

    listRuns: factory.createHandlers(sValidator("param", taskRunParamsSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId, taskId } = c.req.valid("param");
      const result = await taskRunService.listRuns(userId, projectId, taskId);
      return c.json({ data: result });
    }),

    getRun: factory.createHandlers(sValidator("param", taskRunWithIdParamsSchema), async (c) => {
      const userId = c.get("userId");
      const { projectId, taskId, runId } = c.req.valid("param");
      const result = await taskRunService.getRun(userId, projectId, taskId, runId);
      return c.json({ data: result });
    }),
  };
}

export type TaskRunHandlers = ReturnType<typeof createTaskRunHandlers>;
