import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import type { AuthHandlers } from "./handlers.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import type { AuthService } from "./services/auth.service.js";
import { loginSchema, registerSchema } from "./types/request.types.js";

export function createAuthRoutes(handlers: AuthHandlers, authService: AuthService): Hono {
  const auth = new Hono();

  // Public routes (no authentication required)
  auth.post("/register", sValidator("json", registerSchema), handlers.register);
  auth.post("/login", sValidator("json", loginSchema), handlers.login);

  // Protected routes (authentication required)
  const protectedRoutes = new Hono();
  protectedRoutes.use("*", createAuthMiddleware(authService));

  protectedRoutes.post("/logout", handlers.logout);
  protectedRoutes.get("/me", handlers.me);
  protectedRoutes.get("/ws-token", handlers.wsToken);

  auth.route("/", protectedRoutes);

  return auth;
}
