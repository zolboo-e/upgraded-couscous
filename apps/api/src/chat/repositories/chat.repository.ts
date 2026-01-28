import {
  type Database,
  type Message,
  messages,
  type NewMessage,
  type NewSession,
  type Session,
  sessions,
} from "@repo/db";
import { desc, eq } from "drizzle-orm";

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

  async updateClaudeSessionId(id: string, claudeSessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ claudeSessionId, updatedAt: new Date() })
      .where(eq(sessions.id, id));
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
}
