import type { Context, Next } from "hono";
import { InvalidSessionError } from "../errors/auth.errors.js";
import type { AuthService } from "../services/auth.service.js";

export function createAuthMiddleware(authService: AuthService) {
  return async function authMiddleware(c: Context, next: Next): Promise<void> {
    const authHeader = c.req.header("Authorization");
    const sessionToken = authHeader?.replace("Bearer ", "");

    if (!sessionToken) {
      throw new InvalidSessionError();
    }

    const user = await authService.validateSession(sessionToken);
    if (!user) {
      throw new InvalidSessionError();
    }

    c.set("userId", user.id);
    c.set("userEmail", user.email);
    c.set("sessionToken", sessionToken);

    await next();
  };
}

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
    sessionToken: string;
  }
}
