import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { users } from "./users";

export const taskRunStatusEnum = pgEnum("task_run_status", [
  "pending",
  "cloning",
  "running",
  "completed",
  "failed",
]);

export const taskRuns = pgTable("task_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  triggeredBy: uuid("triggered_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: taskRunStatusEnum("status").notNull().default("pending"),
  gitDiff: text("git_diff"),
  commitSha: text("commit_sha"),
  baseCommitSha: text("base_commit_sha"),
  branchName: text("branch_name"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TaskRun = typeof taskRuns.$inferSelect;
export type NewTaskRun = typeof taskRuns.$inferInsert;
