import { Hono } from "hono";
import { getR2Endpoint, R2_CONFIG } from "../config/env.js";
import { getSandboxContext, mountR2Bucket, setEnvironmentVariables } from "../services/index.js";
import type { AppEnv, MountResult } from "../types/index.js";

export const debugRoute = new Hono<AppEnv>().get("/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const { sandbox, isProduction: isProd } = getSandboxContext(c.env, sessionId);

  // Set env vars first (needed for mount)
  await setEnvironmentVariables(sandbox, c.env);

  // Attempt mount and capture result
  let mountResult: MountResult | null = null;
  if (isProd) {
    mountResult = await mountR2Bucket(sandbox, c.env);
  }

  // Get restoration logs, current state, and mount diagnostics
  const [restoreLogs, currentState, mountDiagnostics] = await Promise.all([
    sandbox.exec("cat /tmp/restore.log 2>/dev/null || echo 'No restore log yet'"),
    sandbox.exec(`
			echo "=== Current State ==="
			echo "R2 (/persistent/${sessionId}/.claude):"
			ls -la /persistent/${sessionId}/.claude 2>/dev/null || echo "  Not found"
			echo ""
			echo "Local (/root/.claude):"
			ls -la /root/.claude 2>/dev/null || echo "  Not found"
		`),
    sandbox.exec(`
			echo "=== Mount Diagnostics ==="
			echo "Mountpoints:"
			mount | grep -E "fuse|s3fs" || echo "  No FUSE/S3FS mounts found"
			echo ""
			echo "Check ${R2_CONFIG.mountPath}:"
			mountpoint ${R2_CONFIG.mountPath} 2>&1
			echo ""
			echo "Directory listing:"
			ls -la ${R2_CONFIG.mountPath} 2>&1 | head -20
		`),
  ]);

  return c.json({
    sessionId,
    environment: c.env.ENVIRONMENT ?? "not set",
    isProduction: isProd,
    config: {
      bucketName: R2_CONFIG.bucketName,
      mountPath: R2_CONFIG.mountPath,
      endpoint: getR2Endpoint(c.env),
      cfAccountIdSet: !!c.env.CF_ACCOUNT_ID,
      awsCredsSet: !!(c.env.AWS_ACCESS_KEY_ID && c.env.AWS_SECRET_ACCESS_KEY),
    },
    mountResult,
    mountDiagnostics: mountDiagnostics.stdout,
    restoreLogs: restoreLogs.stdout,
    currentState: currentState.stdout,
  });
});
