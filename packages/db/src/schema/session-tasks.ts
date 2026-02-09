import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./sessions";
import { tasks } from "./tasks";

export const sessionTasks = pgTable(
  "session_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.sessionId, table.taskId)],
);

export type SessionTask = typeof sessionTasks.$inferSelect;
export type NewSessionTask = typeof sessionTasks.$inferInsert;
