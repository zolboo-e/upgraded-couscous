import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { env } from "../config/env.js";
import type { AuthService } from "./services/auth.service.js";
import type { LoginRequest, RegisterRequest } from "./types/request.types.js";
import { generateWsToken } from "./utils/jwt.js";

const SESSION_COOKIE_NAME = "session";

function getCookieOptions(expiresAt?: Date) {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    // Use "none" for cross-origin (API/web on different domains), requires secure=true
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
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

    /**
     * Get a short-lived token for WebSocket connections to sandbox
     * This is needed because browsers can't set Authorization headers on WebSocket
     */
    wsToken: async (c: Context): Promise<Response> => {
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
