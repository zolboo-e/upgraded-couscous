"use client";

import { Button } from "@repo/ui";
import { Play } from "lucide-react";
import { useState } from "react";
import { triggerTaskRun } from "@/lib/actions/task-runs";

interface TaskRunButtonProps {
  projectId: string;
  taskId: string;
  hasRepoConfigured: boolean;
  onRunTriggered?: (runId: string) => void;
}

export function TaskRunButton({
  projectId,
  taskId,
  hasRepoConfigured,
  onRunTriggered,
}: TaskRunButtonProps): React.ReactElement {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (): Promise<void> => {
    setIsRunning(true);
    setError(null);

    const result = await triggerTaskRun(projectId, taskId);

    if (result.success && result.runId) {
      onRunTriggered?.(result.runId);
    } else {
      setError(result.error ?? "Failed to start run");
    }

    setIsRunning(false);
  };

  if (!hasRepoConfigured) {
    return (
      <p className="text-xs text-muted-foreground">
        Configure repository in project settings to run tasks.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <Button type="button" size="sm" variant="default" onClick={handleRun} disabled={isRunning}>
        <Play className="mr-1 h-4 w-4" />
        {isRunning ? "Starting..." : "Run Task"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
