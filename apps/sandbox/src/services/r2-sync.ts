import type { Sandbox } from "@cloudflare/sandbox";
import { getR2Endpoint, R2_CONFIG } from "../config/env.js";
import type { MountResult, RestoreStatus, SyncStatus } from "../types/index.js";

/**
 * Check if the R2 bucket is mounted at the persistent path
 */
export async function isR2Mounted(sandbox: Sandbox): Promise<boolean> {
  const result = await sandbox.exec(
    `mountpoint -q ${R2_CONFIG.mountPath} && echo 'MOUNTED' || echo 'NOT_MOUNTED'`,
  );
  return result.stdout.includes("MOUNTED");
}

/**
 * Wait for R2 mount to be ready with retry logic.
 * The mount operation is async and may not be immediately available.
 */
export async function waitForMount(sandbox: Sandbox, maxRetries = 10): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    if (await isR2Mounted(sandbox)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Mount the R2 bucket for session persistence.
 * Returns a result object indicating success or failure with details.
 */
export async function mountR2Bucket(sandbox: Sandbox, env: Env): Promise<MountResult> {
  // Check if already mounted
  const alreadyMounted = await isR2Mounted(sandbox);
  if (alreadyMounted) {
    console.log("[r2-sync] R2 bucket already mounted");
    return { success: true };
  }

  // Validate credentials before attempting mount
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    const error = "Missing R2 credentials: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not set";
    console.error("[r2-sync]", error);
    return { success: false, error, code: "MISSING_CREDENTIALS" };
  }

  if (!env.CF_ACCOUNT_ID) {
    const error = "Missing CF_ACCOUNT_ID for R2 endpoint";
    console.error("[r2-sync]", error);
    return { success: false, error, code: "INVALID_CONFIG" };
  }

  const endpoint = getR2Endpoint(env);
  console.log("[r2-sync] Attempting R2 mount:", {
    bucket: R2_CONFIG.bucketName,
    mountPath: R2_CONFIG.mountPath,
    endpoint,
  });

  try {
    await sandbox.mountBucket(R2_CONFIG.bucketName, R2_CONFIG.mountPath, {
      endpoint,
      provider: "r2",
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Verify mount succeeded
    const mounted = await isR2Mounted(sandbox);
    if (!mounted) {
      const error = "Mount command succeeded but verification failed - mountpoint not active";
      console.error("[r2-sync]", error);
      return { success: false, error, code: "VERIFICATION_FAILED" };
    }

    console.log("[r2-sync] R2 bucket mounted successfully at", R2_CONFIG.mountPath);
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[r2-sync] Failed to mount R2 bucket:", {
      error,
      bucket: R2_CONFIG.bucketName,
      endpoint,
    });
    return { success: false, error, code: "MOUNT_FAILED" };
  }
}

/**
 * Restore a session from R2 persistent storage.
 * Uses rsync to efficiently sync only changed files.
 *
 * @returns The restoration status
 */
export async function restoreSessionFromR2(
  sandbox: Sandbox,
  sessionId: string,
): Promise<RestoreStatus> {
  const persistentDir = `${R2_CONFIG.mountPath}/${sessionId}/.claude`;
  const localDir = "/root/.claude";

  const script = `
		LOG="/tmp/restore.log"
		PERSISTENT_DIR="${persistentDir}"
		LOCAL_DIR="${localDir}"

		echo "=== Restoration started at $(date) ===" > $LOG
		echo "Session ID: ${sessionId}" >> $LOG
		echo "ENVIRONMENT: $ENVIRONMENT" >> $LOG
		echo "" >> $LOG

		echo "=== Checking /persistent mount ===" >> $LOG
		mountpoint /persistent >> $LOG 2>&1 || echo "/persistent is not a mountpoint" >> $LOG
		ls -la /persistent 2>&1 | head -20 >> $LOG
		echo "" >> $LOG

		echo "=== Checking R2 persistent dir ===" >> $LOG
		ls -la "$PERSISTENT_DIR" >> $LOG 2>&1
		echo "" >> $LOG

		echo "=== Checking local dir ===" >> $LOG
		ls -la "$LOCAL_DIR" >> $LOG 2>&1
		echo "" >> $LOG

		# Always sync from R2 if data exists (rsync efficiently skips unchanged files)
		mkdir -p "$LOCAL_DIR"
		if [ -d "$PERSISTENT_DIR" ] && [ -n "$(ls -A $PERSISTENT_DIR 2>/dev/null)" ]; then
			echo "Syncing from R2..." >> $LOG
			if rsync -av "$PERSISTENT_DIR/" "$LOCAL_DIR/" >> $LOG 2>&1; then
				if [ -n "$(ls -A $LOCAL_DIR 2>/dev/null)" ]; then
					echo "RESTORED" | tee -a $LOG
				else
					echo "RESTORE_VERIFY_FAILED" | tee -a $LOG
				fi
			else
				echo "RESTORE_RSYNC_FAILED" | tee -a $LOG
			fi
		else
			echo "NO_R2_DATA" | tee -a $LOG
		fi

		echo "" >> $LOG
		echo "=== Final state ===" >> $LOG
		echo "Local:" >> $LOG
		ls -la "$LOCAL_DIR" >> $LOG 2>&1
	`;

  const result = await sandbox.exec(script);
  return result.stdout.trim() as RestoreStatus;
}

/**
 * Sync a session back to R2 persistent storage.
 * Uses rsync to efficiently sync only changed files.
 *
 * @returns The sync status
 */
export async function syncSessionToR2(sandbox: Sandbox, sessionId: string): Promise<SyncStatus> {
  const localDir = "/root/.claude";
  const persistentDir = `${R2_CONFIG.mountPath}/${sessionId}/.claude`;

  const script = `
		LOG="/tmp/sync.log"
		LOCAL_DIR="${localDir}"
		PERSISTENT_DIR="${persistentDir}"

		echo "=== Sync started at $(date) ===" > $LOG
		echo "Session ID: ${sessionId}" >> $LOG
		echo "" >> $LOG

		echo "=== Checking /persistent mount ===" >> $LOG
		mountpoint /persistent >> $LOG 2>&1 || echo "/persistent is not a mountpoint" >> $LOG
		echo "" >> $LOG

		echo "=== Checking local dir ===" >> $LOG
		ls -la "$LOCAL_DIR" 2>&1 >> $LOG
		echo "" >> $LOG

		# Sync from local to R2 if local data exists
		if [ -d "$LOCAL_DIR" ] && [ -n "$(ls -A $LOCAL_DIR 2>/dev/null)" ]; then
			echo "Syncing to R2..." >> $LOG
			mkdir -p "$PERSISTENT_DIR"
			if rsync -av "$LOCAL_DIR/" "$PERSISTENT_DIR/" >> $LOG 2>&1; then
				if [ -n "$(ls -A $PERSISTENT_DIR 2>/dev/null)" ]; then
					echo "SYNCED" | tee -a $LOG
				else
					echo "SYNC_VERIFY_FAILED" | tee -a $LOG
				fi
			else
				echo "SYNC_RSYNC_FAILED" | tee -a $LOG
			fi
		else
			echo "NO_LOCAL_DATA" | tee -a $LOG
		fi

		echo "" >> $LOG
		echo "=== Final state ===" >> $LOG
		echo "Persistent:" >> $LOG
		ls -la "$PERSISTENT_DIR" 2>&1 >> $LOG
	`;

  const result = await sandbox.exec(script);
  return result.stdout.trim() as SyncStatus;
}

/**
 * Get the paths for session file operations
 */
export function getSessionPaths(sessionId: string): {
  persistentPath: string;
  localPath: string;
} {
  return {
    persistentPath: `${R2_CONFIG.mountPath}/${sessionId}/.claude/projects/-workspace`,
    localPath: "/root/.claude/projects/-workspace",
  };
}
