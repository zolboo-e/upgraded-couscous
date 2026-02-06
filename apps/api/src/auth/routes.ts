import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import type { AuthHandlers } from "./handlers.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import type { AuthService } from "./services/auth.service.js";
import { loginSchema, registerSchema } from "./types/request.types.js";

export function createAuthRoutes(handlers: AuthHandlers, authService: AuthService) {
  const authMiddleware = createAuthMiddleware(authService);

  // Chain all routes - this preserves type inference for RPC
  return new Hono()
    .post("/register", sValidator("json", registerSchema), handlers.register)
    .post("/login", sValidator("json", loginSchema), handlers.login)
    .get("/me", authMiddleware, handlers.me)
    .get("/me/company", authMiddleware, handlers.meWithCompany);
}
