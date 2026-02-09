"use server";

import { parseResponse } from "hono/client";
import { revalidatePath } from "next/cache";
import { api } from "../api/client";

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskSummary {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TasksListResult {
  tasks: TaskSummary[];
}

export async function getTask(projectId: string, taskId: string): Promise<TaskSummary | null> {
  try {
    const result = await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].$get({ param: { projectId, taskId } }),
    );
    return result.data as TaskSummary;
  } catch {
    return null;
  }
}

export async function getProjectTasks(projectId: string): Promise<TasksListResult | null> {
  try {
    const result = await parseResponse(
      api.projects[":projectId"].tasks.$get({ param: { projectId } }),
    );
    return result.data;
  } catch {
    return null;
  }
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export async function createTask(projectId: string, input: CreateTaskInput): Promise<ActionResult> {
  try {
    await parseResponse(
      api.projects[":projectId"].tasks.$post({
        param: { projectId },
        json: input,
      }),
    );
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export async function updateTask(
  projectId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<ActionResult> {
  try {
    await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].$patch({
        param: { projectId, taskId },
        json: input,
      }),
    );
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

export async function deleteTask(projectId: string, taskId: string): Promise<ActionResult> {
  try {
    await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].$delete({
        param: { projectId, taskId },
      }),
    );
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}
