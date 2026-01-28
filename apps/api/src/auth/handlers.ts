import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { env } from "../config/env.js";
import type { AuthService } from "./services/auth.service.js";
import type { LoginRequest, RegisterRequest } from "./types/request.types.js";

const SESSION_COOKIE_NAME = "session";

function getCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    ...(expiresAt && { expires: expiresAt }),
  };
}

export function createAuthHandlers(authService: AuthService) {
  return {
    register: async (c: Context): Promise<Response> => {
      const input = (await c.req.json()) as RegisterRequest;

      const result = await authService.register(input);

      setCookie(c, SESSION_COOKIE_NAME, result.sessionToken, getCookieOptions(result.expiresAt));

      return c.json({ data: { user: result.user } }, 201);
    },

    login: async (c: Context): Promise<Response> => {
      const input = (await c.req.json()) as LoginRequest;

      const result = await authService.login(input);

      setCookie(c, SESSION_COOKIE_NAME, result.sessionToken, getCookieOptions(result.expiresAt));

      return c.json({ data: { user: result.user } });
    },

    logout: async (c: Context): Promise<Response> => {
      deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });

      return c.json({ success: true });
    },

    me: async (c: Context): Promise<Response> => {
      const userId = c.get("userId");
      const user = await authService.getCurrentUser(userId);

      return c.json({ data: { user } });
    },
  };
}

export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
