import type {
  Message,
  MessageType,
  PermissionRequestContent,
  PermissionResponseContent,
  QuestionAnswerContent,
  QuestionContent,
  Session,
} from "@repo/db";
import { SessionNotFoundError, UnauthorizedAccessError } from "../errors/chat.errors.js";
import type { ChatRepository } from "../repositories/chat.repository.js";
import type { CreateSessionInput, SessionWithMessages } from "../types/chat.types.js";
import { buildProjectSessionPrompt, buildTaskSessionPrompt } from "./system-prompt-builder.js";

export class ChatService {
  constructor(private readonly repository: ChatRepository) {}

  async createSession(userId: string, input: CreateSessionInput): Promise<Session> {
    return this.repository.createSession({
      userId,
      title: input.title ?? null,
      systemPrompt: input.systemPrompt ?? null,
    });
  }

  async listSessions(userId: string): Promise<Session[]> {
    return this.repository.getSessionsByUserId(userId);
  }

  async getSession(userId: string, sessionId: string): Promise<SessionWithMessages> {
    const session = await this.repository.getSessionById(sessionId);

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.userId !== userId) {
      throw new UnauthorizedAccessError("session", sessionId);
    }

    const [systemPrompt, messages] = await Promise.all([
      this.resolveSystemPrompt(session),
      this.repository.getMessagesBySessionId(sessionId),
    ]);

    return { ...session, systemPrompt, messages };
  }

  async getTaskSession(userId: string, taskId: string): Promise<SessionWithMessages> {
    const session = await this.repository.findSessionByTaskId(taskId, userId);

    if (!session) {
      throw new SessionNotFoundError(taskId);
    }

    const [systemPrompt, messages] = await Promise.all([
      this.resolveSystemPrompt(session),
      this.repository.getMessagesBySessionId(session.id),
    ]);

    return { ...session, systemPrompt, messages };
  }

  private async resolveSystemPrompt(session: Session): Promise<string | null> {
    const taskContext = await this.repository.getTaskContextBySessionId(session.id);
    if (taskContext) {
      return buildTaskSessionPrompt(taskContext);
    }

    const projectContext = await this.repository.getProjectContextBySessionId(session.id);
    if (projectContext) {
      return buildProjectSessionPrompt(projectContext);
    }

    return session.systemPrompt;
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.repository.getSessionById(sessionId);

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.userId !== userId) {
      throw new UnauthorizedAccessError("session", sessionId);
    }

    await this.repository.deleteSession(sessionId);
  }

  async saveMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    type?: MessageType,
    metadata?: { model?: string; tokensUsed?: number; stopReason?: string },
  ): Promise<Message> {
    const message = await this.repository.createMessage({
      sessionId,
      role,
      type: type ?? "message",
      content,
      metadata,
    });

    if (role === "assistant") {
      await this.repository.updateSessionTimestamp(sessionId);
    }

    return message;
  }

  async saveUserMessage(sessionId: string, content: string): Promise<Message> {
    return this.repository.createMessage({
      sessionId,
      role: "user",
      content,
    });
  }

  async saveAssistantMessage(
    sessionId: string,
    content: string,
    metadata?: { model?: string; tokensUsed?: number; stopReason?: string },
  ): Promise<Message> {
    const message = await this.repository.createMessage({
      sessionId,
      role: "assistant",
      content,
      metadata,
    });

    await this.repository.updateSessionTimestamp(sessionId);

    return message;
  }

  async getMessageHistory(sessionId: string): Promise<Message[]> {
    return this.repository.getMessagesBySessionId(sessionId);
  }

  async savePermissionExchange(
    sessionId: string,
    request: PermissionRequestContent,
    response: PermissionResponseContent,
  ): Promise<{ requestMessage: Message; responseMessage: Message }> {
    const requestMessage = await this.repository.createMessage({
      sessionId,
      role: "assistant",
      type: "permission_request",
      content: JSON.stringify(request),
    });

    const responseMessage = await this.repository.createMessage({
      sessionId,
      role: "user",
      type: "permission_response",
      content: JSON.stringify(response),
    });

    return { requestMessage, responseMessage };
  }

  async saveQuestionExchange(
    sessionId: string,
    question: QuestionContent,
    answer: QuestionAnswerContent,
  ): Promise<{ questionMessage: Message; answerMessage: Message }> {
    const questionMessage = await this.repository.createMessage({
      sessionId,
      role: "assistant",
      type: "question",
      content: JSON.stringify(question),
    });

    const answerMessage = await this.repository.createMessage({
      sessionId,
      role: "user",
      type: "question_answer",
      content: JSON.stringify(answer),
    });

    return { questionMessage, answerMessage };
  }
}
