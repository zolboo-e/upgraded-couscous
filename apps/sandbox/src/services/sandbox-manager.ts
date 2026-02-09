import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { isProduction, SANDBOX_CONFIG } from "../config/env.js";
import type { SandboxContext } from "../types/index.js";

/**
 * Get a sandbox context for a session
 */
export function getSandboxContext(env: Env, sessionId: string): SandboxContext {
  const sandbox = getSandbox(env.Sandbox, sessionId, { sleepAfter: SANDBOX_CONFIG.sleepAfter });
  return {
    sandbox,
    sessionId,
    isProduction: isProduction(env),
  };
}

/**
 * Set required environment variables on the sandbox
 */
export async function setEnvironmentVariables(sandbox: Sandbox, env: Env): Promise<void> {
  await sandbox.setEnvVars({
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
    ENVIRONMENT: env.ENVIRONMENT ?? "development",
    API_BASE_URL: env.API_BASE_URL ?? "",
    INTERNAL_API_TOKEN: env.INTERNAL_API_TOKEN ?? "",
  });
  console.log("[sandbox-manager] Environment variables set");
}
