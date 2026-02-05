import type { Context } from "hono";
import type { AuthService } from "./services/auth.service.js";
import type { LoginRequest, RegisterRequest } from "./types/request.types.js";
import { generateWsToken } from "./utils/jwt.js";

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

    /**
     * Get a short-lived token for WebSocket connections to sandbox
     * This is needed because browsers can't set Authorization headers on WebSocket
     */
    wsToken: async (c: Context) => {
      const userId = c.get("userId");
      const user = await authService.getCurrentUser(userId);

      if (!user) {
        return c.json({ error: { code: "USER_NOT_FOUND", message: "User not found" } }, 404);
      }

      const token = await generateWsToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      return c.json({ data: { token } });
    },
  };
}

export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
