/**
 * Environment configuration for the container server.
 */

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.ENVIRONMENT === "production";
}

/**
 * Get the Claude model to use
 */
export function getModel(): string {
  return process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
}

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
  port: 8080,
  logFile: "/tmp/server.log",
} as const;

/**
 * R2 sync configuration
 */
export const SYNC_CONFIG = {
  basePath: "/persistent",
  localPath: "/root/.claude",
  projectsDir: "projects",
  todosDir: "todos",
} as const;

/**
 * Telemetry configuration (from environment variables)
 */
export function getTelemetryConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}
