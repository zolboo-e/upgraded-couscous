import { type Database, taskRuns } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";
import type { TaskRunStatus, TaskRunSummary } from "../types/task-run.types.js";

export class TaskRunRepository {
  constructor(private readonly db: Database) {}

  async create(data: { taskId: string; triggeredBy: string }): Promise<TaskRunSummary> {
    const [result] = await this.db
      .insert(taskRuns)
      .values({
        taskId: data.taskId,
        triggeredBy: data.triggeredBy,
      })
      .returning();

    return this.toSummary(result);
  }

  async findById(runId: string): Promise<TaskRunSummary | null> {
    const [result] = await this.db.select().from(taskRuns).where(eq(taskRuns.id, runId)).limit(1);

    return result ? this.toSummary(result) : null;
  }

  async findByTaskId(taskId: string): Promise<TaskRunSummary[]> {
    const results = await this.db
      .select()
      .from(taskRuns)
      .where(eq(taskRuns.taskId, taskId))
      .orderBy(desc(taskRuns.createdAt));

    return results.map((r) => this.toSummary(r));
  }

  async findByIdAndTaskId(runId: string, taskId: string): Promise<TaskRunSummary | null> {
    const [result] = await this.db
      .select()
      .from(taskRuns)
      .where(and(eq(taskRuns.id, runId), eq(taskRuns.taskId, taskId)))
      .limit(1);

    return result ? this.toSummary(result) : null;
  }

  async updateStatus(
    runId: string,
    data: {
      status?: TaskRunStatus;
      gitDiff?: string;
      commitSha?: string;
      baseCommitSha?: string;
      branchName?: string;
      errorMessage?: string;
    },
  ): Promise<TaskRunSummary | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.status !== undefined) {
      updateData.status = data.status;

      if (data.status === "cloning" || data.status === "running") {
        updateData.startedAt = new Date();
      }
      if (data.status === "completed" || data.status === "failed") {
        updateData.completedAt = new Date();
      }
    }
    if (data.gitDiff !== undefined) {
      updateData.gitDiff = data.gitDiff;
    }
    if (data.commitSha !== undefined) {
      updateData.commitSha = data.commitSha;
    }
    if (data.baseCommitSha !== undefined) {
      updateData.baseCommitSha = data.baseCommitSha;
    }
    if (data.branchName !== undefined) {
      updateData.branchName = data.branchName;
    }
    if (data.errorMessage !== undefined) {
      updateData.errorMessage = data.errorMessage;
    }

    const [result] = await this.db
      .update(taskRuns)
      .set(updateData)
      .where(eq(taskRuns.id, runId))
      .returning();

    return result ? this.toSummary(result) : null;
  }

  private toSummary(row: typeof taskRuns.$inferSelect): TaskRunSummary {
    return {
      id: row.id,
      taskId: row.taskId,
      triggeredBy: row.triggeredBy,
      status: row.status as TaskRunStatus,
      gitDiff: row.gitDiff,
      commitSha: row.commitSha,
      baseCommitSha: row.baseCommitSha,
      branchName: row.branchName,
      errorMessage: row.errorMessage,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
