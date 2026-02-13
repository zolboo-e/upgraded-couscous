/**
 * TaskRunDO - Durable Object for managing autonomous task runs
 *
 * Uses the Sandbox SDK's exec() to directly orchestrate git and Claude CLI
 * operations, following the official pattern from:
 * https://github.com/cloudflare/sandbox-sdk/tree/main/examples/claude-code
 *
 * No container HTTP endpoint needed — all execution is driven from the DO.
 */

import { DurableObject } from "cloudflare:workers";
import { getSandbox, type Sandbox } from "@cloudflare/sandbox";

interface TaskRunRequest {
  runId: string;
  taskId: string;
  repoUrl: string;
  githubToken: string;
  defaultBranch: string;
  taskTitle: string;
  taskDescription: string | null;
  taskDetails: string | null;
  internalApiToken: string;
}

interface RunStatusUpdate {
  status?: string;
  gitDiff?: string;
  commitSha?: string;
  baseCommitSha?: string;
  branchName?: string;
  errorMessage?: string;
}

function buildTaskPrompt(req: TaskRunRequest): string {
  const parts = [`Task: ${req.taskTitle}`];

  if (req.taskDescription) {
    parts.push(`Description: ${req.taskDescription}`);
  }
  if (req.taskDetails) {
    parts.push(`Details:\n${req.taskDetails}`);
  }

  parts.push(
    "",
    "Instructions:",
    "- Work in the current directory (a git repo)",
    "- Make all necessary code changes to complete the task",
    "- Do NOT make git commits - the system handles that",
    "- Focus on writing clean, working code",
  );

  return parts.join("\n");
}

function getAuthenticatedUrl(repoUrl: string, token: string): string {
  return repoUrl.replace("https://", `https://x-access-token:${token}@`);
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

async function reportRunStatus(
  runId: string,
  update: RunStatusUpdate,
  apiBaseUrl: string,
  internalApiToken: string,
): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl}/internal/task-runs/${runId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": internalApiToken,
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      console.error(`[TaskRunDO] Failed to report status: ${response.status} ${text}`);
    }
  } catch (error) {
    console.error(
      "[TaskRunDO] Failed to report status:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export class TaskRunDO extends DurableObject<Env> {
  private sandbox: Sandbox | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/start" && request.method === "POST") {
      return this.startRun(request);
    }

    if (url.pathname === "/status" && request.method === "GET") {
      return Response.json({ running: this.sandbox !== null });
    }

    return new Response("Not found", { status: 404 });
  }

  private async startRun(request: Request): Promise<Response> {
    const body = (await request.json()) as TaskRunRequest;
    const { runId, taskId } = body;

    console.log(`[TaskRunDO] Starting run ${runId} for task ${taskId}`);

    try {
      this.sandbox = getSandbox(this.env.Sandbox, runId, {
        sleepAfter: "30m",
      });

      await this.sandbox.setEnvVars({
        ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
      });

      // Fire-and-forget: ctx.waitUntil keeps the DO alive until completion
      this.ctx.waitUntil(this.executeRun(body));

      return Response.json({ started: true });
    } catch (error) {
      console.error("[TaskRunDO] Failed to start run:", error);
      return Response.json(
        { error: error instanceof Error ? error.message : "Failed to start run" },
        { status: 500 },
      );
    }
  }

  private async executeRun(req: TaskRunRequest): Promise<void> {
    const { runId, taskId } = req;
    const sandbox = this.sandbox;
    if (!sandbox) return;

    const apiBaseUrl = this.env.API_BASE_URL ?? "";
    const internalApiToken = req.internalApiToken;
    const repoDir = "/home/user/repo";
    const branchName = `task/${taskId.slice(0, 8)}`;

    const report = (update: RunStatusUpdate): Promise<void> =>
      reportRunStatus(runId, update, apiBaseUrl, internalApiToken);

    try {
      // Step 1: Clone repo
      console.log(`[TaskRunDO] Run ${runId}: Cloning repo...`);
      await report({ status: "cloning" });

      const cloneUrl = getAuthenticatedUrl(req.repoUrl, req.githubToken);
      const cloneResult = await sandbox.exec(`git clone "${cloneUrl}" "${repoDir}"`, {
        timeout: 120_000,
      });
      if (!cloneResult.success) {
        throw new Error(`git clone failed: ${cloneResult.stderr}`);
      }

      // Step 2: Configure git user
      await sandbox.exec(`git -C "${repoDir}" config user.name "Task Runner"`);
      await sandbox.exec(`git -C "${repoDir}" config user.email "task-runner@noreply.local"`);

      // Step 3: Branch management
      const remoteBranchResult = await sandbox.exec(
        `git -C "${repoDir}" ls-remote --heads origin "${branchName}"`,
      );

      if (remoteBranchResult.stdout.trim()) {
        console.log(`[TaskRunDO] Run ${runId}: Checking out existing branch ${branchName}`);
        await sandbox.exec(`git -C "${repoDir}" checkout "${branchName}"`);
      } else {
        console.log(`[TaskRunDO] Run ${runId}: Creating new branch ${branchName}`);
        await sandbox.exec(`git -C "${repoDir}" checkout -b "${branchName}"`);
      }

      // Step 4: Record base commit
      const baseCommitResult = await sandbox.exec(`git -C "${repoDir}" rev-parse HEAD`);
      const baseCommitSha = baseCommitResult.stdout.trim();

      // Step 5: Run Claude CLI
      console.log(`[TaskRunDO] Run ${runId}: Running Claude CLI...`);
      await report({ status: "running", baseCommitSha, branchName });

      const taskPrompt = buildTaskPrompt(req);
      const claudeCmd = [
        `cd "${repoDir}"`,
        `&& claude -p ${escapeShellArg(taskPrompt)}`,
        "--permission-mode acceptEdits",
        "--output-format json",
        "--max-turns 50",
      ].join(" ");

      const claudeResult = await sandbox.exec(claudeCmd, { timeout: 600_000 });
      if (!claudeResult.success) {
        // Claude may exit non-zero but still produce changes; log and continue
        console.warn(`[TaskRunDO] Run ${runId}: Claude CLI exited ${claudeResult.exitCode}`);
      }

      // Step 6: Check for changes
      const statusResult = await sandbox.exec(`git -C "${repoDir}" status --porcelain`);

      if (!statusResult.stdout.trim()) {
        console.log(`[TaskRunDO] Run ${runId}: No changes made by Claude`);
        await report({
          status: "completed",
          gitDiff: "",
          branchName,
          commitSha: baseCommitSha,
        });
        return;
      }

      // Step 7: Commit and push
      console.log(`[TaskRunDO] Run ${runId}: Committing and pushing changes...`);
      await sandbox.exec(`git -C "${repoDir}" add -A`);

      const commitMsg = escapeShellArg(`task: ${req.taskTitle}`);
      const commitResult = await sandbox.exec(`git -C "${repoDir}" commit -m ${commitMsg}`);
      if (!commitResult.success) {
        throw new Error(`git commit failed: ${commitResult.stderr}`);
      }

      const pushResult = await sandbox.exec(`git -C "${repoDir}" push -u origin "${branchName}"`, {
        timeout: 60_000,
      });
      if (!pushResult.success) {
        throw new Error(`git push failed: ${pushResult.stderr}`);
      }

      // Step 8: Capture diff and commit SHA
      const commitShaResult = await sandbox.exec(`git -C "${repoDir}" rev-parse HEAD`);
      const diffResult = await sandbox.exec(
        `git -C "${repoDir}" diff "origin/${req.defaultBranch}...HEAD"`,
      );

      console.log(`[TaskRunDO] Run ${runId}: Completed successfully`);
      await report({
        status: "completed",
        gitDiff: diffResult.stdout,
        commitSha: commitShaResult.stdout.trim(),
        branchName,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskRunDO] Run ${runId}: Failed: ${errorMessage}`);
      await report({ status: "failed", errorMessage, branchName });
    }
  }
}
