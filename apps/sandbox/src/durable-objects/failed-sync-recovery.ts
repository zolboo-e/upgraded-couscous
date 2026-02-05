/**
 * Failed sync persistence and recovery.
 * Stores sync failure metadata in Durable Object storage for retry on next session start.
 */

import type { Sandbox } from "@cloudflare/sandbox";
import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { syncSessionToR2 } from "../services/r2-sync.js";
import type { SyncStatus } from "../types/index.js";

const STORAGE_KEY = "failedSync";

/**
 * Metadata stored when sync fails after all retries.
 * Only stores metadata, NOT file contents (those remain in container filesystem).
 */
export interface FailedSync {
  sessionId: string;
  timestamp: number;
  lastError: string;
  attemptCount: number;
  sourcePaths: string[]; // Which folders needed sync: ["projects", "todos"]
}

export interface RecoveryResult {
  recovered: boolean;
  status: SyncStatus | "NO_FAILED_SYNC" | "SOURCE_MISSING" | "RECOVERY_FAILED";
  error?: string;
}

/**
 * FailedSyncRecovery handles persisting and recovering from sync failures.
 * Uses Durable Object storage to persist failure metadata across restarts.
 */
export class FailedSyncRecovery {
  private storage: DurableObjectStorage;

  constructor(storage: DurableObjectStorage) {
    this.storage = storage;
  }

  /**
   * Record a sync failure after all retries exhausted.
   */
  async recordFailure(sessionId: string, error: string): Promise<void> {
    const existing = await this.getFailedSync();
    const attemptCount = existing ? existing.attemptCount + 1 : 1;

    const failedSync: FailedSync = {
      sessionId,
      timestamp: Date.now(),
      lastError: error,
      attemptCount,
      sourcePaths: ["projects", "todos"], // Standard synced folders
    };

    await this.storage.put(STORAGE_KEY, failedSync);
    console.log("[FailedSyncRecovery] Recorded sync failure:", {
      sessionId,
      attemptCount,
      error,
    });
  }

  /**
   * Check if there's a failed sync pending recovery.
   */
  async hasFailedSync(): Promise<boolean> {
    const data = await this.storage.get<FailedSync>(STORAGE_KEY);
    return data !== undefined;
  }

  /**
   * Get failed sync metadata if exists.
   */
  async getFailedSync(): Promise<FailedSync | null> {
    const data = await this.storage.get<FailedSync>(STORAGE_KEY);
    return data ?? null;
  }

  /**
   * Clear failed sync metadata (after successful recovery or abandonment).
   */
  async clearFailedSync(): Promise<void> {
    await this.storage.delete(STORAGE_KEY);
    console.log("[FailedSyncRecovery] Cleared failed sync metadata");
  }

  /**
   * Attempt to recover from a previous failed sync.
   * Call this at session start before normal restore flow.
   */
  async attemptRecovery(sandbox: Sandbox, sessionId: string): Promise<RecoveryResult> {
    const failedSync = await this.getFailedSync();

    if (!failedSync) {
      return { recovered: false, status: "NO_FAILED_SYNC" };
    }

    // Verify session ID matches (sanity check)
    if (failedSync.sessionId !== sessionId) {
      console.warn("[FailedSyncRecovery] Session ID mismatch, clearing stale failure:", {
        stored: failedSync.sessionId,
        current: sessionId,
      });
      await this.clearFailedSync();
      return { recovered: false, status: "NO_FAILED_SYNC" };
    }

    console.log("[FailedSyncRecovery] Attempting recovery:", {
      sessionId,
      attemptCount: failedSync.attemptCount,
      originalError: failedSync.lastError,
    });

    // Check if source files still exist in container
    const sourceExists = await this.checkSourceExists(sandbox);
    if (!sourceExists) {
      console.log("[FailedSyncRecovery] Source files missing (container restarted), clearing");
      await this.clearFailedSync();
      return { recovered: false, status: "SOURCE_MISSING" };
    }

    // Attempt the sync
    try {
      const syncStatus = await syncSessionToR2(sandbox, sessionId);

      if (syncStatus === "SYNCED" || syncStatus === "NO_LOCAL_DATA") {
        console.log("[FailedSyncRecovery] Recovery successful:", syncStatus);
        await this.clearFailedSync();
        return { recovered: true, status: syncStatus };
      }

      // Still failing - update attempt count
      await this.recordFailure(sessionId, `Recovery failed: ${syncStatus}`);
      return {
        recovered: false,
        status: syncStatus,
        error: `Sync returned ${syncStatus}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.recordFailure(sessionId, `Recovery exception: ${errorMsg}`);
      return {
        recovered: false,
        status: "RECOVERY_FAILED",
        error: errorMsg,
      };
    }
  }

  /**
   * Check if source files exist in the container filesystem.
   * Returns false if container has restarted and lost local files.
   */
  private async checkSourceExists(sandbox: Sandbox): Promise<boolean> {
    try {
      const result = await sandbox.exec(
        '[ -d "/root/.claude" ] && [ "$(ls -A /root/.claude 2>/dev/null)" ] && echo "EXISTS" || echo "EMPTY"',
      );
      return result.stdout.trim() === "EXISTS";
    } catch {
      return false;
    }
  }
}
