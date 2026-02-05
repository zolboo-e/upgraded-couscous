import type { Context } from "hono";
import type { ChatService } from "./services/chat.service.js";
import type { CreateSessionInput } from "./types/chat.types.js";

export function createChatHandlers(chatService: ChatService) {
  return {
    createSession: async (c: Context) => {
      const userId = c.get("userId");
      const input = (await c.req.json()) as CreateSessionInput;

      const session = await chatService.createSession(userId, input);

      return c.json({ data: session }, 201);
    },

    listSessions: async (c: Context) => {
      const userId = c.get("userId");

      const sessions = await chatService.listSessions(userId);

      return c.json({ data: sessions });
    },

    getSession: async (c: Context) => {
      const userId = c.get("userId");
      const id = c.req.param("id");

      const session = await chatService.getSession(userId, id);

      return c.json({ data: session });
    },

    deleteSession: async (c: Context) => {
      const userId = c.get("userId");
      const id = c.req.param("id");

      await chatService.deleteSession(userId, id);

      return c.json({ success: true });
    },
  };
}

export type ChatHandlers = ReturnType<typeof createChatHandlers>;
