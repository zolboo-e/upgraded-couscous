import { createDb } from "@repo/db";
import { createApp } from "./app.js";
import { createInternalModule } from "./internal/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = createDb(databaseUrl);

const app = createApp(db);

const internalModule = createInternalModule(db);
app.route("/internal", internalModule.routes);

export default app;
