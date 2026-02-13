import { Hono } from "hono";
import type { AppEnv } from "../types/index.js";

export const taskRunRoute = new Hono<AppEnv>().post("/", async (c) => {
  const body = await c.req.json<{ runId: string }>();
  const { runId } = body;

  if (!runId) {
    return c.json({ error: "runId is required" }, 400);
  }

  const doId = c.env.TaskRunDO.idFromName(runId);
  const taskRunDo = c.env.TaskRunDO.get(doId);

  const doRequest = new Request("https://internal/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const response = await taskRunDo.fetch(doRequest);
  const result = await response.json();

  return c.json(result, response.status as 200);
});
