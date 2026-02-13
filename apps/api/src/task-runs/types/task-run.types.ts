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
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRunListResponse {
  runs: TaskRunSummary[];
}

export interface TriggerRunResponse {
  runId: string;
}
