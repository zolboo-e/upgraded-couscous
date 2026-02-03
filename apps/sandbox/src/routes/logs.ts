import { Hono } from "hono";
import { getSandboxContext } from "../services/index.js";
import type { AppEnv } from "../types/index.js";

export const logsRoute = new Hono<AppEnv>().get("/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const { sandbox } = getSandboxContext(c.env, sessionId);

  const result = await sandbox.exec("cat /tmp/server.log 2>/dev/null || echo 'No logs yet'");
  return c.text(result.stdout);
});
