import { Hono } from "hono";
import { CONTAINER_CONFIG } from "../config/env.js";
import {
  getSandboxContext,
  mountR2Bucket,
  restoreSessionFromR2,
  setEnvironmentVariables,
} from "../services/index.js";
import type { AppEnv } from "../types/index.js";

export const websocketRoute = new Hono<AppEnv>().get("/", async (c) => {
  console.log("[/ws] WebSocket upgrade request received");

  // Check for WebSocket upgrade
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    console.log("[/ws] Not a WebSocket upgrade request");
    return c.json({ error: "Expected WebSocket upgrade" }, 426);
  }

  // Get sandbox context for this connection
  const sessionId = c.req.query("sessionId") ?? "ws";
  console.log("[/ws] Getting sandbox context for sessionId:", sessionId);
  const { sandbox, isProduction: isProd } = getSandboxContext(c.env, sessionId);

  // Set environment variables FIRST (AWS creds needed for bucket mount)
  await setEnvironmentVariables(sandbox, c.env);

  // Mount R2 bucket and restore session (production only)
  if (isProd) {
    const mountResult = await mountR2Bucket(sandbox, c.env);

    if (!mountResult.success) {
      console.error("[/ws] R2 mount failed:", mountResult);

      // For credential/config issues, return error immediately
      if (mountResult.code === "MISSING_CREDENTIALS" || mountResult.code === "INVALID_CONFIG") {
        return c.json(
          {
            error: "Storage configuration error",
            details: mountResult.error,
            code: mountResult.code,
          },
          503,
        );
      }

      // For mount failures, log but continue (session will start fresh)
      console.warn("[/ws] Continuing without R2 persistence for session:", sessionId);
    } else {
      // Only attempt restore if mount succeeded
      const restoreStatus = await restoreSessionFromR2(sandbox, sessionId);

      switch (restoreStatus) {
        case "RESTORED":
          console.log("[/ws] Session synced from R2 for:", sessionId);
          break;
        case "RESTORE_RSYNC_FAILED":
          console.error("[/ws] Failed to restore session - rsync error for:", sessionId);
          return c.json({ error: "Failed to restore session data from storage" }, 503);
        case "RESTORE_VERIFY_FAILED":
          console.error("[/ws] Failed to restore session - verification failed for:", sessionId);
          return c.json({ error: "Session restoration verification failed" }, 503);
        case "NO_R2_DATA":
          console.log("[/ws] No R2 data to restore for:", sessionId);
          break;
      }
    }
  } else {
    console.log("[/ws] Skipping R2 mount/restore (development mode)");
  }

  // Start container server
  const process = await sandbox.startProcess(CONTAINER_CONFIG.entrypoint);
  console.log("[/ws] Process started with ID:", process.id);

  // Wait for server to be ready
  try {
    await process.waitForPort(CONTAINER_CONFIG.port, {
      timeout: CONTAINER_CONFIG.startTimeout,
      path: CONTAINER_CONFIG.healthPath,
    });
    console.log("[/ws] Server ready on port", CONTAINER_CONFIG.port);
  } catch (error) {
    console.log("[/ws] Server failed to start:", error);
    const logs = await sandbox.getProcessLogs(process.id);
    console.log("[/ws] Process logs:", logs);
    return c.json(
      {
        error: "Container server failed to start",
        logs: logs,
      },
      503,
    );
  }

  // Proxy the WebSocket connection to the container's server
  return sandbox.wsConnect(c.req.raw, CONTAINER_CONFIG.port);
});
