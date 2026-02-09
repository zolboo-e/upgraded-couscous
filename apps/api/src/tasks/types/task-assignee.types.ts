import { z } from "zod";

export interface TaskAssigneeWithUser {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  createdAt: Date;
}

export interface TaskAssigneesListResponse {
  assignees: TaskAssigneeWithUser[];
}

export const addAssigneeSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const assigneeParamsSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  taskId: z.string().uuid("Invalid task ID"),
  userId: z.string().uuid("Invalid user ID"),
});

export type AddAssigneeRequest = z.infer<typeof addAssigneeSchema>;
export type AssigneeParams = z.infer<typeof assigneeParamsSchema>;
