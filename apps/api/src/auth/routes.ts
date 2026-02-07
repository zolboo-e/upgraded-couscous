import { factory } from "../shared/factory.js";
import type { AuthHandlers } from "./handlers.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import type { AuthService } from "./services/auth.service.js";

export function createAuthRoutes(handlers: AuthHandlers, authService: AuthService) {
  const authMiddleware = createAuthMiddleware(authService);

  return factory
    .createApp()
    .post("/register", ...handlers.register)
    .post("/login", ...handlers.login)
    .get("/me", authMiddleware, ...handlers.me)
    .get("/me/company", authMiddleware, ...handlers.meWithCompany);
}
