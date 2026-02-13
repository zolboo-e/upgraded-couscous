"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { useCallback, useEffect, useState } from "react";
import {
  getTaskRun,
  getTaskRuns,
  type TaskRunStatus,
  type TaskRunSummary,
} from "@/lib/actions/task-runs";

interface TaskRunsPanelProps {
  projectId: string;
  taskId: string;
  activeRunId?: string | null;
}

const STATUS_LABELS: Record<TaskRunStatus, string> = {
  pending: "Pending",
  cloning: "Cloning",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_VARIANTS: Record<TaskRunStatus, "default" | "secondary" | "destructive" | "outline"> =
  {
    pending: "outline",
    cloning: "secondary",
    running: "secondary",
    completed: "default",
    failed: "destructive",
  };

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskRunsPanel({
  projectId,
  taskId,
  activeRunId,
}: TaskRunsPanelProps): React.ReactElement | null {
  const [runs, setRuns] = useState<TaskRunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<TaskRunSummary | null>(null);

  const fetchRuns = useCallback(async () => {
    const result = await getTaskRuns(projectId, taskId);
    setRuns(result);
  }, [projectId, taskId]);

  // Poll for active run
  useEffect(() => {
    if (!activeRunId) return;

    const poll = async (): Promise<void> => {
      const run = await getTaskRun(projectId, taskId, activeRunId);
      if (run) {
        setSelectedRun(run);
        if (run.status === "completed" || run.status === "failed") {
          fetchRuns();
        }
      }
    };

    poll();
    const interval = setInterval(poll, 3000);

    return () => clearInterval(interval);
  }, [activeRunId, projectId, taskId, fetchRuns]);

  // Initial load
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const displayRun = selectedRun ?? runs[0] ?? null;

  if (runs.length === 0 && !activeRunId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Task Runs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Run list */}
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-sm transition-colors hover:bg-muted ${
                displayRun?.id === run.id ? "border-primary bg-muted" : ""
              }`}
              onClick={() => setSelectedRun(run)}
            >
              <span className="truncate font-mono text-xs">{run.id.slice(0, 8)}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatTime(run.createdAt)}</span>
                <Badge variant={STATUS_VARIANTS[run.status]}>{STATUS_LABELS[run.status]}</Badge>
              </div>
            </button>
          ))}
        </div>

        {/* Active run status */}
        {activeRunId && selectedRun && !["completed", "failed"].includes(selectedRun.status) && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-sm font-medium">{STATUS_LABELS[selectedRun.status]}...</p>
            {selectedRun.branchName && (
              <p className="text-xs text-muted-foreground">Branch: {selectedRun.branchName}</p>
            )}
          </div>
        )}

        {/* Diff viewer */}
        {displayRun?.gitDiff && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Changes</p>
              {displayRun.branchName && (
                <span className="font-mono text-xs text-muted-foreground">
                  {displayRun.branchName}
                </span>
              )}
            </div>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 font-mono text-xs">
              {displayRun.gitDiff}
            </pre>
          </div>
        )}

        {displayRun?.gitDiff === "" && displayRun.status === "completed" && (
          <p className="text-sm text-muted-foreground">No changes were made.</p>
        )}

        {/* Error display */}
        {displayRun?.errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-xs text-destructive">{displayRun.errorMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
