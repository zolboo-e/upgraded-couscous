import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(255, "Task title must be at most 255 characters"),
  description: z.string().max(2000, "Description must be at most 2000 characters").optional(),
  details: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  details: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export const taskParamsSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  taskId: z.string().uuid("Invalid task ID"),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type CreateTaskRequest = z.infer<typeof createTaskSchema>;
export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;
export type TaskParams = z.infer<typeof taskParamsSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
