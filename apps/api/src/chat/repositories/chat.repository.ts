import {
  type Database,
  type Message,
  messages,
  type NewMessage,
  type NewSession,
  projectMembers,
  projects,
  type Session,
  sessionProjects,
  sessions,
  sessionTasks,
  taskAssignees,
  tasks,
  users,
} from "@repo/db";
import { and, desc, eq, ne } from "drizzle-orm";
import type {
  ProjectSessionContext,
  TaskSessionContext,
} from "../services/system-prompt-builder.js";

export class ChatRepository {
  constructor(private readonly db: Database) {}

  async createSession(data: NewSession): Promise<Session> {
    const [session] = await this.db.insert(sessions).values(data).returning();
    return session;
  }

  async getSessionById(id: string): Promise<Session | null> {
    const [session] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return session ?? null;
  }

  async getSessionsByUserId(userId: string): Promise<Session[]> {
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.updatedAt));
  }

  async updateSessionTimestamp(id: string): Promise<void> {
    await this.db.update(sessions).set({ updatedAt: new Date() }).where(eq(sessions.id, id));
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  async createMessage(data: NewMessage): Promise<Message> {
    const [message] = await this.db.insert(messages).values(data).returning();
    return message;
  }

  async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async linkSessionToTask(sessionId: string, taskId: string): Promise<void> {
    await this.db.insert(sessionTasks).values({ sessionId, taskId });
  }

  async linkSessionToProject(sessionId: string, projectId: string): Promise<void> {
    await this.db.insert(sessionProjects).values({ sessionId, projectId });
  }

  async findSessionByTaskId(taskId: string, userId: string): Promise<Session | null> {
    const [result] = await this.db
      .select({ session: sessions })
      .from(sessionTasks)
      .innerJoin(sessions, eq(sessionTasks.sessionId, sessions.id))
      .where(and(eq(sessionTasks.taskId, taskId), eq(sessions.userId, userId)))
      .limit(1);
    return result?.session ?? null;
  }

  async findSessionByProjectId(projectId: string, userId: string): Promise<Session | null> {
    const [result] = await this.db
      .select({ session: sessions })
      .from(sessionProjects)
      .innerJoin(sessions, eq(sessionProjects.sessionId, sessions.id))
      .where(and(eq(sessionProjects.projectId, projectId), eq(sessions.userId, userId)))
      .limit(1);
    return result?.session ?? null;
  }

  async getTaskContextBySessionId(sessionId: string): Promise<TaskSessionContext | null> {
    const [taskRow] = await this.db
      .select({
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskDescription: tasks.description,
        taskStatus: tasks.status,
        taskPriority: tasks.priority,
        taskDueDate: tasks.dueDate,
        projectId: projects.id,
        projectName: projects.name,
        projectDescription: projects.description,
      })
      .from(sessionTasks)
      .innerJoin(tasks, eq(sessionTasks.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(sessionTasks.sessionId, sessionId))
      .limit(1);

    if (!taskRow) {
      return null;
    }

    const assigneeRows = await this.db
      .select({ name: users.name, email: users.email })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskRow.taskId));

    const siblingRows = await this.db
      .select({ title: tasks.title, status: tasks.status, priority: tasks.priority })
      .from(tasks)
      .where(and(eq(tasks.projectId, taskRow.projectId), ne(tasks.id, taskRow.taskId)));

    return {
      task: {
        title: taskRow.taskTitle,
        description: taskRow.taskDescription,
        status: taskRow.taskStatus,
        priority: taskRow.taskPriority,
        dueDate: taskRow.taskDueDate,
      },
      project: {
        name: taskRow.projectName,
        description: taskRow.projectDescription,
      },
      assignees: assigneeRows.map((r) => r.name ?? r.email),
      siblingTasks: siblingRows,
    };
  }

  async getProjectContextBySessionId(sessionId: string): Promise<ProjectSessionContext | null> {
    const [projectRow] = await this.db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        projectDescription: projects.description,
      })
      .from(sessionProjects)
      .innerJoin(projects, eq(sessionProjects.projectId, projects.id))
      .where(eq(sessionProjects.sessionId, sessionId))
      .limit(1);

    if (!projectRow) {
      return null;
    }

    const memberRows = await this.db
      .select({ name: users.name, email: users.email, role: projectMembers.role })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectRow.projectId));

    const taskRows = await this.db
      .select({ title: tasks.title, status: tasks.status, priority: tasks.priority })
      .from(tasks)
      .where(eq(tasks.projectId, projectRow.projectId));

    return {
      project: {
        name: projectRow.projectName,
        description: projectRow.projectDescription,
      },
      members: memberRows,
      tasks: taskRows,
    };
  }
}
