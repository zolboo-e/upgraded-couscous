import type { Database } from "@repo/db";
import { createAuthHandlers } from "./handlers.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { AuthRepository } from "./repositories/auth.repository.js";
import { createAuthRoutes } from "./routes.js";
import { AuthService } from "./services/auth.service.js";

export function createAuthModule(db: Database) {
  const repository = new AuthRepository(db);
  const authService = new AuthService(repository);
  const handlers = createAuthHandlers(authService);
  const routes = createAuthRoutes(handlers, authService);
  const middleware = createAuthMiddleware(authService);

  return {
    routes,
    authService,
    middleware,
  };
}

export type AuthModule = ReturnType<typeof createAuthModule>;
export { createAuthMiddleware } from "./middleware/auth.middleware.js";
