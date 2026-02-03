import { exec } from "node:child_process";
import { appendFileSync } from "node:fs";
import { promisify } from "node:util";
import { SERVER_CONFIG } from "../config/index.js";
import type { ExecFn, Logger, Telemetry } from "../types/index.js";

/**
 * Promisified exec for shell commands
 */
export const execAsync: ExecFn = promisify(exec);

/**
 * Creates a logger with optional telemetry integration
 */
export function createLogger(telemetry?: Telemetry): Logger {
  const log = (level: "info" | "error" | "debug", message: string, data?: unknown): void => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const line =
      data !== undefined ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;

    console.log(line);
    appendFileSync(SERVER_CONFIG.logFile, `${line}\n`);

    // Also push to Upstash (fire and forget)
    if (telemetry) {
      telemetry.logToUpstash(line).catch(() => {});
    }
  };

  return {
    info: (message: string, data?: unknown) => log("info", message, data),
    error: (message: string, data?: unknown) => log("error", message, data),
    debug: (message: string, data?: unknown) => log("debug", message, data),
  };
}
