import { sValidator } from "@hono/standard-validator";
import { factory } from "../shared/factory.js";
import type { ChatService } from "./services/chat.service.js";
import { createSessionSchema, sessionIdSchema } from "./types/request.types.js";

export function createChatHandlers(chatService: ChatService) {
  return {
    createSession: factory.createHandlers(sValidator("json", createSessionSchema), async (c) => {
      const userId = c.get("userId");
      const input = c.req.valid("json");
      const session = await chatService.createSession(userId, input);
      return c.json({ data: session }, 201);
    }),

    listSessions: factory.createHandlers(async (c) => {
      const userId = c.get("userId");
      const sessions = await chatService.listSessions(userId);
      return c.json({ data: sessions });
    }),

    getSession: factory.createHandlers(sValidator("param", sessionIdSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.valid("param");
      const session = await chatService.getSession(userId, id);
      return c.json({ data: session });
    }),

    deleteSession: factory.createHandlers(sValidator("param", sessionIdSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.valid("param");
      await chatService.deleteSession(userId, id);
      return c.json({ success: true });
    }),
  };
}

export type ChatHandlers = ReturnType<typeof createChatHandlers>;
