import { Redis } from "@upstash/redis";
import { getTelemetryConfig } from "../config/index.js";
import type { ShutdownLogEntry, Telemetry } from "../types/index.js";

/**
 * Creates a telemetry client for Upstash Redis logging.
 * Returns a no-op telemetry if credentials are not configured.
 */
export function createTelemetry(): Telemetry {
  const config = getTelemetryConfig();

  if (!config) {
    // Return no-op telemetry if not configured
    console.log("[telemetry] Upstash credentials not configured, telemetry disabled");
    return {
      logToUpstash: async () => {},
      logShutdownToUpstash: async () => {},
    };
  }

  const redis = new Redis({
    url: config.url,
    token: config.token,
  });

  return {
    async logToUpstash(line: string): Promise<void> {
      try {
        await redis.lpush("sandbox:server:logs", line);
      } catch {
        // Fire and forget - don't throw on telemetry failures
      }
    },

    async logShutdownToUpstash(entry: ShutdownLogEntry): Promise<void> {
      try {
        await redis.lpush("sandbox:shutdown:logs", JSON.stringify(entry));
      } catch {
        // Fire and forget - don't throw on telemetry failures
      }
    },
  };
}
