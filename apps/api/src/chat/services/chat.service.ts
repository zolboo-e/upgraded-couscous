import type {
  Message,
  PermissionRequestContent,
  PermissionResponseContent,
  QuestionAnswerContent,
  QuestionContent,
  Session,
} from "@repo/db";
import { SessionNotFoundError, UnauthorizedAccessError } from "../errors/chat.errors.js";
import type { ChatRepository } from "../repositories/chat.repository.js";
import type { CreateSessionInput, SessionWithMessages } from "../types/chat.types.js";

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

    const messages = await this.repository.getMessagesBySessionId(sessionId);

    return { ...session, messages };
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
