import { type Database, projects, type Task, tasks } from "@repo/db";
import { eq } from "drizzle-orm";
import type { TaskPriority, TaskStatus, TaskSummary } from "../types/task.types.js";

export class TaskRepository {
  constructor(private readonly db: Database) {}

  async findByProjectId(projectId: string): Promise<TaskSummary[]> {
    const results = await this.db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.createdAt);

    return results.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async findById(taskId: string): Promise<TaskSummary | null> {
    const [result] = await this.db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      projectId: result.projectId,
      title: result.title,
      description: result.description,
      status: result.status as TaskStatus,
      priority: result.priority as TaskPriority,
      dueDate: result.dueDate,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async create(data: {
    projectId: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: Date;
  }): Promise<Task> {
    const [task] = await this.db
      .insert(tasks)
      .values({
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? "medium",
        dueDate: data.dueDate ?? null,
      })
      .returning();
    return task;
  }

  async update(
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: Date | null;
    },
  ): Promise<Task | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }

    const [result] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    return result ?? null;
  }

  async delete(taskId: string): Promise<boolean> {
    const result = await this.db.delete(tasks).where(eq(tasks.id, taskId)).returning();
    return result.length > 0;
  }

  async getTaskProjectId(taskId: string): Promise<string | null> {
    const [result] = await this.db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    return result?.projectId ?? null;
  }

  async getProjectCompanyId(projectId: string): Promise<string | null> {
    const [result] = await this.db
      .select({ companyId: projects.companyId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return result?.companyId ?? null;
  }
}
