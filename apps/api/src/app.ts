import type { Database } from "@repo/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { UpgradeWebSocket } from "hono/ws";
import { createAuthModule } from "./auth/index.js";
import { createChatModule } from "./chat/index.js";
import { env } from "./config/env.js";
import { errorHandler } from "./shared/middleware/error-handler.js";

export function createApp(db: Database, upgradeWebSocket: UpgradeWebSocket) {
  const authModule = createAuthModule(db);
  const chatModule = createChatModule(db, upgradeWebSocket, authModule.middleware);

  // Chain sub-routers and export THIS type for RPC
  // Following Hono best practices: https://hono.dev/docs/guides/rpc#using-rpc-with-larger-applications
  const routes = new Hono()
    .use("*", logger())
    .use("*", cors({ origin: env.FRONTEND_URL, credentials: true }))
    .use("*", errorHandler)
    .route("/auth", authModule.routes)
    .route("/chat", chatModule.routes)
    .get("/", (c) => c.json({ message: "Welcome to Upgraded Couscous API", version: "1.0.0" }))
    .get("/health", (c) => c.json({ status: "ok" }));

  return routes;
}

// Export the type of the chained routes for RPC client
export type AppType = ReturnType<typeof createApp>;
