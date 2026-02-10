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

      const message = await chatService.saveMessage(
        sessionId,
        body.role,
        body.content,
        body.type,
        body.metadata,
      );

      return c.json({ messageId: message.id });
    },

    async updateTask(c: Context): Promise<Response> {
      const taskId = c.req.param("taskId");
      const body = await c.req.json<{
        title?: string;
        description?: string | null;
        details?: string | null;
      }>();

      if (
        body.title === undefined &&
        body.description === undefined &&
        body.details === undefined
      ) {
        return c.json(
          { error: "At least one field (title, description, or details) is required" },
          400,
        );
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
        details: body.details,
      });

      return c.json({ task: updated });
    },
  };
}
