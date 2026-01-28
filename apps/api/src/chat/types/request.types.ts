import { z } from "zod";

export const createSessionSchema = z.object({
  title: z.string().max(255).optional(),
  systemPrompt: z.string().max(10000).optional(),
});

export const sessionIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateSessionRequest = z.infer<typeof createSessionSchema>;
export type SessionIdParam = z.infer<typeof sessionIdSchema>;
