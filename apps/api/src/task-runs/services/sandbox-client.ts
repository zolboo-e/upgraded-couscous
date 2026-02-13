import { TaskRunTriggerError } from "../errors/task-run.errors.js";
import type { SandboxClient } from "./task-run.service.js";

interface SandboxTriggerPayload {
  runId: string;
  taskId: string;
  repoUrl: string;
  githubToken: string;
  defaultBranch: string;
  taskTitle: string;
  taskDescription: string | null;
  taskDetails: string | null;
}

export function createSandboxClient(
  sandboxUrl: string,
  sandboxApiToken: string,
  internalApiToken: string,
): SandboxClient {
  return {
    async triggerTaskRun(payload: SandboxTriggerPayload): Promise<void> {
      if (!sandboxUrl || !sandboxApiToken) {
        throw new TaskRunTriggerError("Sandbox is not configured");
      }

      const baseUrl = new URL(sandboxUrl.replace(/^ws/, "http")).origin;

      const response = await fetch(`${baseUrl}/task-runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sandboxApiToken}`,
        },
        body: JSON.stringify({
          ...payload,
          internalApiToken,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new TaskRunTriggerError(`Failed to trigger task run: ${response.status} ${text}`);
      }
    },
  };
}
