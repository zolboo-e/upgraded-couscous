import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { sessions } from "./sessions";

export const sessionProjects = pgTable(
  "session_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.sessionId, table.projectId)],
);

export type SessionProject = typeof sessionProjects.$inferSelect;
export type NewSessionProject = typeof sessionProjects.$inferInsert;
