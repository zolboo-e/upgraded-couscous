"use server";

import { parseResponse } from "hono/client";
import { revalidatePath } from "next/cache";
import { api } from "../api/client";
import type { ActionResult } from "./tasks";

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  createdAt: string;
}

export interface TaskAssigneesResult {
  assignees: TaskAssignee[];
}

export async function getTaskAssignees(
  projectId: string,
  taskId: string,
): Promise<TaskAssigneesResult | null> {
  try {
    const result = await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].assignees.$get({
        param: { projectId, taskId },
      }),
    );
    return result.data as TaskAssigneesResult;
  } catch {
    return null;
  }
}

export async function addTaskAssignee(
  projectId: string,
  taskId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].assignees.$post({
        param: { projectId, taskId },
        json: { userId },
      }),
    );
    revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add assignee",
    };
  }
}

export async function removeTaskAssignee(
  projectId: string,
  taskId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].assignees[":userId"].$delete({
        param: { projectId, taskId, userId },
      }),
    );
    revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove assignee",
    };
  }
}
