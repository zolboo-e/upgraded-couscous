import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { createDb } from "@repo/db";
import { Hono } from "hono";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createEchoRoutes } from "./echo.js";
import { createInternalModule } from "./internal/index.js";

// Create a base Hono instance for WebSocket injection
const baseApp = new Hono();

// Set up WebSocket - must be called on the base app
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: baseApp });

// Initialize database
const db = createDb(env.DATABASE_URL);

// Create the typed app with all public routes
const app = createApp(db, upgradeWebSocket);

// Mount the typed app on the base app at root
// This preserves route paths while allowing WebSocket injection to work
baseApp.route("/", app);

// Mount additional routes not part of the public API type
const internalModule = createInternalModule(db);
baseApp.route("/internal", internalModule.routes);

const echoRoutes = createEchoRoutes(env, upgradeWebSocket);
baseApp.route("/echo", echoRoutes);

console.log(`Server is running on http://localhost:${env.PORT}`);

const server = serve({
  fetch: baseApp.fetch,
  port: env.PORT,
});

// Inject WebSocket handler into the server
injectWebSocket(server);

// Export the typed app for RPC client type extraction
export default app;
