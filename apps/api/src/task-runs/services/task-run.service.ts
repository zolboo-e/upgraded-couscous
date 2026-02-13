import type { ProjectMeta } from "@repo/db";
import {
  ForbiddenError,
  NoCompanyMembershipError,
  ProjectNotFoundError,
} from "../../projects/errors/project.errors.js";
import type { ProjectRepository } from "../../projects/repositories/project.repository.js";
import type { TaskRepository } from "../../tasks/repositories/task.repository.js";
import { ProjectRepoNotConfiguredError, TaskRunNotFoundError } from "../errors/task-run.errors.js";
import type { TaskRunRepository } from "../repositories/task-run.repository.js";
import type {
  TaskRunListResponse,
  TaskRunSummary,
  TriggerRunResponse,
} from "../types/task-run.types.js";

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

export interface SandboxClient {
  triggerTaskRun(payload: SandboxTriggerPayload): Promise<void>;
}

export class TaskRunService {
  constructor(
    private readonly taskRunRepository: TaskRunRepository,
    private readonly taskRepository: TaskRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly sandboxClient: SandboxClient,
  ) {}

  async triggerRun(userId: string, projectId: string, taskId: string): Promise<TriggerRunResponse> {
    await this.validateProjectAccess(userId, projectId);

    const task = await this.taskRepository.findById(taskId);
    if (!task || task.projectId !== projectId) {
      throw new TaskRunNotFoundError();
    }

    const project = await this.projectRepository.findByIdRaw(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const meta = (project.meta ?? {}) as ProjectMeta;
    if (!meta.repoUrl || !meta.githubToken) {
      throw new ProjectRepoNotConfiguredError();
    }

    const run = await this.taskRunRepository.create({
      taskId,
      triggeredBy: userId,
    });

    await this.sandboxClient.triggerTaskRun({
      runId: run.id,
      taskId,
      repoUrl: meta.repoUrl,
      githubToken: meta.githubToken,
      defaultBranch: meta.defaultBranch ?? "main",
      taskTitle: task.title,
      taskDescription: task.description,
      taskDetails: task.details,
    });

    return { runId: run.id };
  }

  async listRuns(userId: string, projectId: string, taskId: string): Promise<TaskRunListResponse> {
    await this.validateProjectAccess(userId, projectId);

    const runs = await this.taskRunRepository.findByTaskId(taskId);
    return { runs };
  }

  async getRun(
    userId: string,
    projectId: string,
    taskId: string,
    runId: string,
  ): Promise<TaskRunSummary> {
    await this.validateProjectAccess(userId, projectId);

    const run = await this.taskRunRepository.findByIdAndTaskId(runId, taskId);
    if (!run) {
      throw new TaskRunNotFoundError();
    }

    return run;
  }

  private async validateProjectAccess(userId: string, projectId: string): Promise<void> {
    const membership = await this.projectRepository.getUserCompanyMembership(userId);
    if (!membership) {
      throw new NoCompanyMembershipError();
    }

    const projectCompanyId = await this.projectRepository.getProjectCompanyId(projectId);
    if (!projectCompanyId) {
      throw new ProjectNotFoundError();
    }

    if (projectCompanyId !== membership.companyId) {
      throw new ForbiddenError("You do not have access to this project");
    }
  }
}
