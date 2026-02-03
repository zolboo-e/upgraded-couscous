import { Hono } from "hono";
import { bearerAuth, corsMiddleware } from "./middleware/index.js";
import { debugRoute, filesRoute, healthRoute, logsRoute, websocketRoute } from "./routes/index.js";
import type { AppEnv } from "./types/index.js";

/**
 * Create and configure the Hono application
 */
function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // Global middleware
  app.use("*", corsMiddleware);

  // Public routes (no auth required)
  app.route("/health", healthRoute);

  // Protected routes (require bearer token)
  app.use("/ws", bearerAuth);
  app.use("/files/*", bearerAuth);
  app.use("/logs/*", bearerAuth);
  app.use("/debug/*", bearerAuth);

  // Mount protected route handlers
  app.route("/ws", websocketRoute);
  app.route("/files", filesRoute);
  app.route("/logs", logsRoute);
  app.route("/debug", debugRoute);

  return app;
}

export const app = createApp();
export default app;
