import type { Server } from "node:http";
import { WebSocket, type WebSocketServer } from "ws";
import type { SessionMessageQueue } from "../session/message-queue.js";
import type { ExecFn, Logger, SessionState, ShutdownLogEntry, Telemetry } from "../types/index.js";

export interface ShutdownDeps {
  wss: WebSocketServer;
  server: Server;
  sessions: Map<WebSocket, SessionState>;
  sessionQueue: SessionMessageQueue;
  syncSession: (sessionId: string | null) => Promise<void>;
  telemetry: Telemetry;
  logger: Logger;
  execFn: ExecFn;
}

/**
 * Create a graceful shutdown handler
 */
export function createGracefulShutdown(deps: ShutdownDeps): (signal: string) => Promise<void> {
  const { wss, server, sessions, sessionQueue, syncSession, telemetry, logger, execFn } = deps;

  return async function gracefulShutdown(signal: string): Promise<void> {
    const startTime = Date.now();
    logger.info(`Received ${signal} - starting graceful shutdown`);

    const syncResults: ShutdownLogEntry["syncedSessions"] = [];
    const sessionIds: string[] = [];
    let shutdownStatus: ShutdownLogEntry["shutdownStatus"] = "success";
    let errorMessage: string | undefined;

    try {
      // 1. Close all WebSocket connections gracefully
      const closePromises: Promise<void>[] = [];
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          closePromises.push(
            new Promise<void>((resolve) => {
              client.close(1001, "Server shutting down");
              client.once("close", () => resolve());
              // Timeout if client doesn't respond
              setTimeout(resolve, 1000);
            }),
          );
        }
      });
      await Promise.all(closePromises);
      logger.info(`Closed ${closePromises.length} WebSocket connections`);

      // 2. Clean up all sessions and sync to persistent storage
      for (const [ws, session] of sessions.entries()) {
        sessionQueue.cleanup(ws);
        if (session.sessionId) {
          sessionIds.push(session.sessionId);
          try {
            await syncSession(session.sessionId);
            syncResults.push({ sessionId: session.sessionId, status: "success" });
          } catch (error) {
            syncResults.push({
              sessionId: session.sessionId,
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
      sessions.clear();

      // 3. Log to Upstash before closing servers
      const logs = await (async () => {
        try {
          const { stdout } = await execFn("cat /tmp/server.log 2>/dev/null || echo ''");
          return stdout;
        } catch {
          return "";
        }
      })();

      await telemetry.logShutdownToUpstash({
        timestamp: new Date().toISOString(),
        signal,
        sessionIds,
        connectionsCount: closePromises.length,
        syncedSessions: syncResults,
        shutdownStatus,
        durationMs: Date.now() - startTime,
        logs,
      });

      // 4. Close WebSocket server
      wss.close(() => {
        logger.info("WebSocket server closed");
      });

      // 5. Close HTTP server
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });

      // Force exit after timeout (Cloudflare grace period is ~10-30s)
      setTimeout(async () => {
        logger.error("Shutdown timeout exceeded - forcing exit");
        await telemetry.logShutdownToUpstash({
          timestamp: new Date().toISOString(),
          signal,
          sessionIds,
          connectionsCount: closePromises.length,
          syncedSessions: syncResults,
          shutdownStatus: "timeout",
          durationMs: Date.now() - startTime,
          logs,
        });
        process.exit(1);
      }, 8000);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Shutdown error", errorMessage);
      shutdownStatus = "error";

      // Log error to Upstash
      const logs = await (async () => {
        try {
          const { stdout } = await execFn("cat /tmp/server.log 2>/dev/null || echo ''");
          return stdout;
        } catch {
          return "";
        }
      })();

      await telemetry.logShutdownToUpstash({
        timestamp: new Date().toISOString(),
        signal,
        sessionIds,
        connectionsCount: 0,
        syncedSessions: syncResults,
        shutdownStatus,
        errorMessage,
        durationMs: Date.now() - startTime,
        logs,
      });

      process.exit(1);
    }
  };
}
