"use server";

import { parseResponse } from "hono/client";
import { api } from "../api/client";
import type { ActionResult } from "../types";

export type TaskRunStatus = "pending" | "cloning" | "running" | "completed" | "failed";

export interface TaskRunSummary {
  id: string;
  taskId: string;
  triggeredBy: string;
  status: TaskRunStatus;
  gitDiff: string | null;
  commitSha: string | null;
  baseCommitSha: string | null;
  branchName: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerRunResult extends ActionResult {
  runId?: string;
}

export async function triggerTaskRun(projectId: string, taskId: string): Promise<TriggerRunResult> {
  try {
    const result = await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].runs.$post({
        param: { projectId, taskId },
      }),
    );
    return { success: true, runId: result.data.runId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to trigger task run",
    };
  }
}

export async function getTaskRuns(projectId: string, taskId: string): Promise<TaskRunSummary[]> {
  try {
    const result = await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].runs.$get({
        param: { projectId, taskId },
      }),
    );
    return result.data.runs;
  } catch {
    return [];
  }
}

export async function getTaskRun(
  projectId: string,
  taskId: string,
  runId: string,
): Promise<TaskRunSummary | null> {
  try {
    const result = await parseResponse(
      api.projects[":projectId"].tasks[":taskId"].runs[":runId"].$get({
        param: { projectId, taskId, runId },
      }),
    );
    return result.data;
  } catch {
    return null;
  }
}
