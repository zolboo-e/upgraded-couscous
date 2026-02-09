import type { Message } from "@repo/db";
import type { Context } from "hono";
import type { ChatService } from "../chat/services/chat.service.js";
import type { TaskRepository } from "../tasks/repositories/task.repository.js";

export interface InternalHandlers {
  saveMessage: (c: Context) => Promise<Response>;
  updateTask: (c: Context) => Promise<Response>;
}

export function createInternalHandlers(
  chatService: ChatService,
  taskRepository: TaskRepository,
): InternalHandlers {
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

    async updateTask(c: Context): Promise<Response> {
      const taskId = c.req.param("taskId");
      const body = await c.req.json<{
        title?: string;
        description?: string | null;
      }>();

      if (!body.title && body.description === undefined) {
        return c.json({ error: "At least one field (title or description) is required" }, 400);
      }

      if (body.title !== undefined && (body.title.length === 0 || body.title.length > 255)) {
        return c.json({ error: "Title must be between 1 and 255 characters" }, 400);
      }

      if (
        body.description !== undefined &&
        body.description !== null &&
        body.description.length > 2000
      ) {
        return c.json({ error: "Description must be at most 2000 characters" }, 400);
      }

      const task = await taskRepository.findById(taskId);
      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }

      const updated = await taskRepository.update(taskId, {
        title: body.title,
        description: body.description,
      });

      return c.json({ task: updated });
    },
  };
}
