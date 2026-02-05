import type { Context } from "hono";
import type { AuthService } from "./services/auth.service.js";
import type { LoginRequest, RegisterRequest } from "./types/request.types.js";

export function createAuthHandlers(authService: AuthService) {
  return {
    register: async (c: Context) => {
      const input = (await c.req.json()) as RegisterRequest;

      const result = await authService.register(input);

      return c.json({ data: { user: result.user, token: result.sessionToken } }, 201);
    },

    login: async (c: Context) => {
      const input = (await c.req.json()) as LoginRequest;

      const result = await authService.login(input);

      return c.json({ data: { user: result.user, token: result.sessionToken } });
    },

    me: async (c: Context) => {
      const userId = c.get("userId");
      const user = await authService.getCurrentUser(userId);

      return c.json({ data: { user } });
    },
  };
}

export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
