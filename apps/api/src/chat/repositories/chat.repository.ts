import {
  type Database,
  type Message,
  messages,
  type NewMessage,
  type NewSession,
  type Session,
  sessionProjects,
  sessions,
  sessionTasks,
} from "@repo/db";
import { and, desc, eq } from "drizzle-orm";

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
}
