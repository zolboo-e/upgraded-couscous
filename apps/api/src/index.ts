import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) => {
  return c.json({
    message: "Welcome to Upgraded Couscous API",
    version: "1.0.0",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

const port = Number(process.env.PORT) || 3001;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
