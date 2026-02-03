/**
 * WebSocket v2 route using SessionDO
 *
 * This route:
 * 1. Validates JWT token
 * 2. Routes to SessionDO for the session
 * 3. SessionDO handles container lifecycle and message relay
 */

import { Hono } from "hono";
import { extractToken, verifyJWT } from "../services/index.js";
import type { AppEnv } from "../types/index.js";

export const websocketV2Route = new Hono<AppEnv>().get("/", async (c) => {
  console.log("[/ws/v2] WebSocket upgrade request received");

  // Check for WebSocket upgrade
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    console.log("[/ws/v2] Not a WebSocket upgrade request");
    return c.json({ error: "Expected WebSocket upgrade" }, 426);
  }

  // Validate JWT
  const token = extractToken(c.req.raw);
  if (!token) {
    console.log("[/ws/v2] No JWT token found");
    return c.json({ error: "Authentication required" }, 401);
  }

  if (!c.env.JWT_SECRET) {
    console.error("[/ws/v2] JWT_SECRET not configured");
    return c.json({ error: "Server configuration error" }, 500);
  }

  const user = await verifyJWT(token, c.env.JWT_SECRET);
  if (!user) {
    console.log("[/ws/v2] Invalid JWT token");
    return c.json({ error: "Invalid authentication token" }, 401);
  }

  console.log("[/ws/v2] Authenticated user:", user.userId);

  // Get session ID from query params
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    console.log("[/ws/v2] No sessionId provided");
    return c.json({ error: "sessionId query parameter required" }, 400);
  }

  // Get SessionDO instance by session ID
  const doId = c.env.SessionDO.idFromName(sessionId);
  const sessionDo = c.env.SessionDO.get(doId);

  // Build URL for DO with session info
  const url = new URL(c.req.url);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("userId", user.userId);

  // Forward request to SessionDO
  const doRequest = new Request(url.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
  });

  console.log("[/ws/v2] Routing to SessionDO for session:", sessionId);
  return sessionDo.fetch(doRequest);
});
