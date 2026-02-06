import type { Database } from "@repo/db";
import { createDb } from "@repo/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuthModule } from "./auth/index.js";
import { createChatModule } from "./chat/index.js";
import { env } from "./config/env.js";
import { createInternalModule } from "./internal/index.js";
import { errorHandler } from "./shared/middleware/error-handler.js";

function createApp(db: Database) {
  const authModule = createAuthModule(db);
  const chatModule = createChatModule(db, authModule.middleware);

  // Chain sub-routers and export THIS type for RPC
  // Following Hono best practices: https://hono.dev/docs/guides/rpc#using-rpc-with-larger-applications
  const routes = new Hono()
    .use("*", logger())
    .use("*", cors({ origin: env.FRONTEND_URL, credentials: true }))
    .use("*", errorHandler)
    .route("/auth", authModule.routes)
    .route("/chat", chatModule.routes)
    .get("/health", (c) => c.json({ status: "ok" }));

  return routes;
}

// Export the type of the chained routes for RPC client
export type AppType = ReturnType<typeof createApp>;

// Initialize app
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = createDb(databaseUrl);
const app = createApp(db);

const internalModule = createInternalModule(db);
app.route("/internal", internalModule.routes);

export default app;
