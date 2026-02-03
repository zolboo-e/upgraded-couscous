import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { createDb } from "@repo/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuthModule } from "./auth/index.js";
import { createChatModule } from "./chat/index.js";
import { env } from "./config/env.js";
import { createEchoRoutes } from "./echo.js";
import { createInternalModule } from "./internal/index.js";
import { errorHandler } from "./shared/middleware/error-handler.js";

const app = new Hono();

// Set up WebSocket
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use("*", errorHandler);

// Initialize database
const db = createDb(env.DATABASE_URL);

// Mount auth routes
const authModule = createAuthModule(db);
app.route("/auth", authModule.routes);

// Mount chat routes (with real auth middleware)
const chatModule = createChatModule(db, upgradeWebSocket, authModule.middleware);
app.route("/chat", chatModule.routes);

// Mount echo routes (for testing WebSocket proxy)
const echoRoutes = createEchoRoutes(env, upgradeWebSocket);
app.route("/echo", echoRoutes);

// Mount internal routes (for service-to-service communication)
const internalModule = createInternalModule(db);
app.route("/internal", internalModule.routes);

// Health and root endpoints
app.get("/", (c) => {
  return c.json({
    message: "Welcome to Upgraded Couscous API",
    version: "1.0.0",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

console.log(`Server is running on http://localhost:${env.PORT}`);

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
});

// Inject WebSocket handler into the server
injectWebSocket(server);

export default app;
