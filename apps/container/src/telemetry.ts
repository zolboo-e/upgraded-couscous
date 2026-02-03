import { Redis } from "@upstash/redis";
import type { ShutdownLogEntry, Telemetry } from "./types.js";

/**
 * Creates a telemetry client for Upstash Redis logging
 */
export function createTelemetry(redisUrl: string, redisToken: string): Telemetry {
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
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

/**
 * Default Upstash Redis configuration
 */
export const DEFAULT_REDIS_URL = "https://tough-emu-62604.upstash.io";
export const DEFAULT_REDIS_TOKEN =
  "AfSMAAIncDFiMDlhODIzMzgyZGM0YWM0YTc1ZDlmYWVjZjBkNjQ3MHAxNjI2MDQ";
