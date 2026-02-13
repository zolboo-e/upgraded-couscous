import { Hono } from "hono";
import { bearerAuth, corsMiddleware } from "./middleware/index.js";
import {
  debugRoute,
  filesRoute,
  healthRoute,
  logsRoute,
  taskRunRoute,
  websocketRoute,
  websocketV2Route,
} from "./routes/index.js";
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

  // WebSocket v2 route (uses JWT auth, not bearer token)
  app.route("/ws/v2", websocketV2Route);

  // Task run route (uses bearer token auth)
  app.use("/task-runs", bearerAuth);
  app.route("/task-runs", taskRunRoute);

  return app;
}

export const app = createApp();
export default app;
