import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types/index.js";

/**
 * Bearer token authentication middleware.
 * Validates the Authorization header against the API_TOKEN environment variable.
 */
export const bearerAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  if (token !== c.env.API_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});
