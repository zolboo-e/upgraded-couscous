import { Hono } from "hono";
import type { AppEnv } from "../types/index.js";

export const healthRoute = new Hono<AppEnv>().get("/", (c) => {
  return c.json({
    status: "ok",
    service: "sandbox-worker",
    timestamp: new Date().toISOString(),
  });
});
