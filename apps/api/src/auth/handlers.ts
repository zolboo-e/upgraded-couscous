import { sValidator } from "@hono/standard-validator";
import { factory } from "../shared/factory.js";
import type { AuthService } from "./services/auth.service.js";
import { loginSchema, registerSchema } from "./types/request.types.js";

export function createAuthHandlers(authService: AuthService) {
  return {
    register: factory.createHandlers(sValidator("json", registerSchema), async (c) => {
      const input = c.req.valid("json");
      const result = await authService.register(input);
      return c.json({ data: { user: result.user, token: result.sessionToken } }, 201);
    }),

    login: factory.createHandlers(sValidator("json", loginSchema), async (c) => {
      const input = c.req.valid("json");
      const result = await authService.login(input);
      return c.json({ data: { user: result.user, token: result.sessionToken } });
    }),

    me: factory.createHandlers(async (c) => {
      const userId = c.get("userId");
      const user = await authService.getCurrentUser(userId);
      return c.json({ data: { user } });
    }),

    meWithCompany: factory.createHandlers(async (c) => {
      const userId = c.get("userId");
      const result = await authService.getCurrentUserWithCompany(userId);
      return c.json({ data: result });
    }),
  };
}

export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
