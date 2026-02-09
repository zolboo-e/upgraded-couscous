import {
  ForbiddenError,
  NoCompanyMembershipError,
  ProjectNotFoundError,
} from "../../projects/errors/project.errors.js";
import type { ProjectRepository } from "../../projects/repositories/project.repository.js";
import type { TaskRepository } from "../repositories/task.repository.js";
import type { TaskAssigneeRepository } from "../repositories/task-assignee.repository.js";
import type { TaskAssigneesListResponse } from "../types/task-assignee.types.js";

export class TaskAssigneeService {
  constructor(
    private readonly assigneeRepository: TaskAssigneeRepository,
    private readonly taskRepository: TaskRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  private async validateTaskAccess(
    userId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    const membership = await this.projectRepository.getUserCompanyMembership(userId);

    if (!membership) {
      throw new NoCompanyMembershipError();
    }

    const projectCompanyId = await this.taskRepository.getProjectCompanyId(projectId);

    if (!projectCompanyId) {
      throw new ProjectNotFoundError();
    }

    if (projectCompanyId !== membership.companyId) {
      throw new ForbiddenError("You do not have access to this project");
    }

    const taskProjectId = await this.taskRepository.getTaskProjectId(taskId);

    if (taskProjectId !== projectId) {
      throw new ForbiddenError("Task does not belong to this project");
    }
  }

  async getAssignees(
    userId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskAssigneesListResponse> {
    await this.validateTaskAccess(userId, projectId, taskId);

    const assignees = await this.assigneeRepository.findByTaskId(taskId);

    return { assignees };
  }

  async addAssignee(
    userId: string,
    projectId: string,
    taskId: string,
    assigneeUserId: string,
  ): Promise<void> {
    await this.validateTaskAccess(userId, projectId, taskId);
    await this.assigneeRepository.create(taskId, assigneeUserId);
  }

  async removeAssignee(
    userId: string,
    projectId: string,
    taskId: string,
    assigneeUserId: string,
  ): Promise<void> {
    await this.validateTaskAccess(userId, projectId, taskId);
    const deleted = await this.assigneeRepository.delete(taskId, assigneeUserId);

    if (!deleted) {
      throw new ForbiddenError("Assignee not found");
    }
  }
}
