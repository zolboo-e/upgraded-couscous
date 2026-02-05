import { serve } from "@hono/node-server";
import { createDb } from "@repo/db";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createInternalModule } from "./internal/index.js";

// Initialize database
const db = createDb(env.DATABASE_URL);

// Create the typed app with all public routes
const app = createApp(db);

// Mount additional routes not part of the public API type
const internalModule = createInternalModule(db);
app.route("/internal", internalModule.routes);

console.log(`Server is running on http://localhost:${env.PORT}`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

// Export the typed app for RPC client type extraction
export default app;
