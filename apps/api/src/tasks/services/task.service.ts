import type { ChatRepository } from "../../chat/repositories/chat.repository.js";
import {
  ForbiddenError,
  NoCompanyMembershipError,
  ProjectNotFoundError,
} from "../../projects/errors/project.errors.js";
import type { ProjectRepository } from "../../projects/repositories/project.repository.js";
import { TaskNotFoundError } from "../errors/task.errors.js";
import type { TaskRepository } from "../repositories/task.repository.js";
import type {
  CreatedTask,
  TaskPriority,
  TaskStatus,
  TasksListResponse,
  UpdatedTask,
} from "../types/task.types.js";

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly chatRepository: ChatRepository,
  ) {}

  private async validateProjectAccess(userId: string, projectId: string): Promise<void> {
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
  }

  async getTasks(userId: string, projectId: string): Promise<TasksListResponse> {
    await this.validateProjectAccess(userId, projectId);

    const tasks = await this.taskRepository.findByProjectId(projectId);

    return { tasks };
  }

  async getTask(userId: string, projectId: string, taskId: string): Promise<CreatedTask> {
    await this.validateProjectAccess(userId, projectId);

    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new TaskNotFoundError();
    }

    if (task.projectId !== projectId) {
      throw new ForbiddenError("Task does not belong to this project");
    }

    return task;
  }

  async createTask(
    userId: string,
    projectId: string,
    data: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
    },
  ): Promise<CreatedTask> {
    await this.validateProjectAccess(userId, projectId);

    const task = await this.taskRepository.create({
      projectId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });

    const session = await this.chatRepository.createSession({
      userId,
      title: task.title,
    });
    await this.chatRepository.linkSessionToTask(session.id, task.id);

    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async updateTask(
    userId: string,
    projectId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string | null;
    },
  ): Promise<UpdatedTask> {
    await this.validateProjectAccess(userId, projectId);

    const existingTask = await this.taskRepository.findById(taskId);

    if (!existingTask) {
      throw new TaskNotFoundError();
    }

    if (existingTask.projectId !== projectId) {
      throw new ForbiddenError("Task does not belong to this project");
    }

    const task = await this.taskRepository.update(taskId, {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
    });

    if (!task) {
      throw new TaskNotFoundError();
    }

    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async deleteTask(userId: string, projectId: string, taskId: string): Promise<void> {
    await this.validateProjectAccess(userId, projectId);

    const existingTask = await this.taskRepository.findById(taskId);

    if (!existingTask) {
      throw new TaskNotFoundError();
    }

    if (existingTask.projectId !== projectId) {
      throw new ForbiddenError("Task does not belong to this project");
    }

    await this.taskRepository.delete(taskId);
  }
}
