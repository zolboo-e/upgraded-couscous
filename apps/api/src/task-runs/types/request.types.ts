import { z } from "zod";

export const taskRunParamsSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  taskId: z.string().uuid("Invalid task ID"),
});

export const taskRunWithIdParamsSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  taskId: z.string().uuid("Invalid task ID"),
  runId: z.string().uuid("Invalid run ID"),
});

export type TaskRunParams = z.infer<typeof taskRunParamsSchema>;
export type TaskRunWithIdParams = z.infer<typeof taskRunWithIdParamsSchema>;
