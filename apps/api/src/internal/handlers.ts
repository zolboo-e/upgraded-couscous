import type { Message } from "@repo/db";
import type { Context } from "hono";
import type { ChatService } from "../chat/services/chat.service.js";

export interface InternalHandlers {
  saveMessage: (c: Context) => Promise<Response>;
}

export function createInternalHandlers(chatService: ChatService): InternalHandlers {
  return {
    async saveMessage(c: Context): Promise<Response> {
      const sessionId = c.req.param("sessionId");
      const body = await c.req.json<{
        role: "user" | "assistant";
        type?:
          | "message"
          | "permission_request"
          | "permission_response"
          | "question"
          | "question_answer";
        content: string;
        metadata?: {
          model?: string;
          tokensUsed?: number;
          stopReason?: string;
        };
      }>();

      let message: Message;
      if (body.role === "user") {
        message = await chatService.saveUserMessage(sessionId, body.content);
      } else {
        message = await chatService.saveAssistantMessage(sessionId, body.content, body.metadata);
      }

      return c.json({ messageId: message.id });
    },
  };
}
