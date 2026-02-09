import { type Database, taskAssignees, users } from "@repo/db";
import { and, eq } from "drizzle-orm";
import type { TaskAssigneeWithUser } from "../types/task-assignee.types.js";

export class TaskAssigneeRepository {
  constructor(private readonly db: Database) {}

  async findByTaskId(taskId: string): Promise<TaskAssigneeWithUser[]> {
    const results = await this.db
      .select({
        id: taskAssignees.id,
        taskId: taskAssignees.taskId,
        userId: taskAssignees.userId,
        userName: users.name,
        userEmail: users.email,
        createdAt: taskAssignees.createdAt,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId));

    return results;
  }

  async create(taskId: string, userId: string): Promise<void> {
    await this.db.insert(taskAssignees).values({ taskId, userId });
  }

  async delete(taskId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)))
      .returning();
    return result.length > 0;
  }
}
