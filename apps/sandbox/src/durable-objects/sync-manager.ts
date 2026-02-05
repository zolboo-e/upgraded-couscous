/**
 * SyncManager handles all R2 synchronization with:
 * - Debounced sync requests (configurable interval)
 * - Mutex to prevent concurrent syncs
 * - Retry with exponential backoff
 * - State machine for tracking sync lifecycle
 * - Failed sync recovery via DO storage
 */

import type { Sandbox } from "@cloudflare/sandbox";
import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { syncSessionToR2 } from "../services/r2-sync.js";
import type { SyncStatus } from "../types/index.js";
import { sleep } from "../utils/retry.js";
import { FailedSyncRecovery } from "./failed-sync-recovery.js";
import {
  canTransition,
  createSyncContext,
  DEFAULT_SYNC_CONFIG,
  type SyncConfig,
  type SyncContext,
  type SyncState,
} from "./sync-state-machine.js";

export interface SyncResult {
  success: boolean;
  status: SyncStatus | "ERROR" | "SKIPPED";
  error?: string;
  durationMs: number;
}

/**
 * SyncManager orchestrates R2 synchronization with debouncing and reliability.
 */
export class SyncManager {
  private config: SyncConfig;
  private context: SyncContext;
  private sandbox: Sandbox | null = null;
  private sessionId: string | null = null;
  private firstRequestTime: number | null = null;
  private debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private syncPromise: Promise<SyncResult> | null = null;
  private pendingResolvers: Array<{
    resolve: (result: SyncResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private statusCallback: ((status: string) => void) | null = null;
  private failedSyncRecovery: FailedSyncRecovery | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.context = createSyncContext();
  }

  /**
   * Initialize with sandbox, session, and DO storage for sync operations.
   */
  initialize(sandbox: Sandbox, sessionId: string, storage?: DurableObjectStorage): void {
    this.sandbox = sandbox;
    this.sessionId = sessionId;

    if (storage) {
      this.failedSyncRecovery = new FailedSyncRecovery(storage);
    }
  }

  /**
   * Set callback for status updates (to browser).
   */
  setStatusCallback(callback: (status: string) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Attempt recovery from previous failed sync.
   * Call this at session start before normal operations.
   */
  async attemptRecovery(): Promise<boolean> {
    if (!this.failedSyncRecovery || !this.sandbox || !this.sessionId) {
      return false;
    }

    const result = await this.failedSyncRecovery.attemptRecovery(this.sandbox, this.sessionId);
    if (result.recovered) {
      console.log("[SyncManager] Recovered from previous failed sync");
      this.statusCallback?.("recovered");
    } else if (result.status !== "NO_FAILED_SYNC") {
      console.warn("[SyncManager] Recovery attempt failed:", result);
    }

    return result.recovered;
  }

  /**
   * Request a sync. Returns a promise that resolves when sync completes.
   * Multiple concurrent requests are batched into a single sync operation.
   */
  requestSync(): Promise<SyncResult> {
    // If already syncing, increment pending count and return promise
    if (this.context.state === "syncing" || this.context.state === "retrying") {
      this.context.pendingCount++;
      return new Promise((resolve, reject) => {
        this.pendingResolvers.push({ resolve, reject });
      });
    }

    // Track first request for max debounce
    if (this.firstRequestTime === null) {
      this.firstRequestTime = Date.now();
    }

    // Clear existing debounce
    if (this.debounceTimeoutId !== null) {
      clearTimeout(this.debounceTimeoutId);
      this.debounceTimeoutId = null;
    }

    // Calculate remaining debounce time
    const elapsed = Date.now() - this.firstRequestTime;
    const remainingDebounce = Math.min(
      this.config.debounceMs,
      Math.max(0, this.config.maxDebounceMs - elapsed),
    );

    return new Promise((resolve, reject) => {
      this.pendingResolvers.push({ resolve, reject });

      if (remainingDebounce <= 0) {
        // Max debounce exceeded, sync immediately
        this.executeSync();
      } else {
        // Schedule debounced sync
        this.transitionTo("pending");
        this.debounceTimeoutId = setTimeout(() => this.executeSync(), remainingDebounce);
      }
    });
  }

  /**
   * Force immediate sync, bypassing debounce.
   * Use this on disconnect to ensure data is persisted.
   */
  async forceSync(): Promise<SyncResult> {
    if (this.debounceTimeoutId !== null) {
      clearTimeout(this.debounceTimeoutId);
      this.debounceTimeoutId = null;
    }
    return this.executeSync();
  }

  /**
   * Cancel pending sync (e.g., on session end).
   */
  cancel(): void {
    if (this.debounceTimeoutId !== null) {
      clearTimeout(this.debounceTimeoutId);
      this.debounceTimeoutId = null;
    }
    this.transitionTo("idle");
    this.firstRequestTime = null;

    // Resolve pending with skip status
    const skipResult: SyncResult = {
      success: true,
      status: "SKIPPED",
      durationMs: 0,
    };
    this.resolvePending(skipResult);
  }

  /**
   * Get current sync state for debugging/status.
   */
  getState(): SyncContext {
    return { ...this.context };
  }

  /**
   * Transition to a new state with validation.
   */
  private transitionTo(newState: SyncState): void {
    // Allow same-state transition for "idle" reset
    if (this.context.state === newState) {
      return;
    }

    if (!canTransition(this.context.state, newState)) {
      console.warn(`[SyncManager] Invalid transition: ${this.context.state} -> ${newState}`);
      return;
    }
    console.log(`[SyncManager] State: ${this.context.state} -> ${newState}`);
    this.context.state = newState;
    this.statusCallback?.(newState);
  }

  /**
   * Execute the sync operation with mutex protection.
   */
  private async executeSync(): Promise<SyncResult> {
    // Prevent concurrent syncs (mutex)
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.performSync();

    try {
      return await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  /**
   * Perform the actual sync with retry logic.
   */
  private async performSync(): Promise<SyncResult> {
    const startTime = Date.now();

    // Validate prerequisites
    if (!this.sandbox || !this.sessionId) {
      const result: SyncResult = {
        success: false,
        status: "ERROR",
        error: "Sandbox or sessionId not initialized",
        durationMs: Date.now() - startTime,
      };
      this.resolvePending(result);
      return result;
    }

    this.transitionTo("syncing");
    this.firstRequestTime = null; // Reset for next batch

    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        this.transitionTo("retrying");
        this.context.retryCount = attempt;

        // Exponential backoff with jitter
        const delay = Math.min(
          this.config.baseRetryDelayMs * 2 ** (attempt - 1) + Math.random() * 100,
          this.config.maxRetryDelayMs,
        );
        await sleep(delay);
      }

      try {
        // Execute rsync to R2
        const syncStatus = await syncSessionToR2(this.sandbox, this.sessionId);

        if (syncStatus === "SYNCED") {
          // Execute filesystem flush
          this.transitionTo("flushing");
          await this.flushFilesystem();

          const result: SyncResult = {
            success: true,
            status: syncStatus,
            durationMs: Date.now() - startTime,
          };

          this.context.lastSyncAt = Date.now();
          this.context.lastError = null;
          this.context.retryCount = 0;

          // Check for pending requests during sync
          if (this.context.pendingCount > 0) {
            this.context.pendingCount = 0;
            this.transitionTo("pending");
            // Schedule next sync after short delay
            this.debounceTimeoutId = setTimeout(() => this.executeSync(), this.config.debounceMs);
          } else {
            this.transitionTo("idle");
          }

          this.resolvePending(result);
          return result;
        }

        // NO_LOCAL_DATA is a success case (nothing to sync)
        if (syncStatus === "NO_LOCAL_DATA") {
          const result: SyncResult = {
            success: true,
            status: syncStatus,
            durationMs: Date.now() - startTime,
          };
          this.handlePendingAfterSuccess();
          this.resolvePending(result);
          return result;
        }

        // Retryable failure
        lastError = new Error(`Sync failed with status: ${syncStatus}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      console.error(
        `[SyncManager] Attempt ${attempt + 1}/${this.config.maxRetries + 1} failed:`,
        lastError.message,
      );
    }

    // All retries exhausted - record failure for recovery
    this.transitionTo("error");
    this.context.lastError = lastError?.message ?? "Unknown error";

    if (this.failedSyncRecovery && this.sessionId) {
      await this.failedSyncRecovery.recordFailure(
        this.sessionId,
        lastError?.message ?? "Unknown error",
      );
    }

    const result: SyncResult = {
      success: false,
      status: "ERROR",
      error: lastError?.message,
      durationMs: Date.now() - startTime,
    };

    // Reset to idle for future sync attempts
    this.context.state = "idle";
    this.resolvePending(result);
    return result;
  }

  /**
   * Handle pending sync requests after a successful sync.
   */
  private handlePendingAfterSuccess(): void {
    if (this.context.pendingCount > 0) {
      this.context.pendingCount = 0;
      this.transitionTo("pending");
      this.debounceTimeoutId = setTimeout(() => this.executeSync(), this.config.debounceMs);
    } else {
      this.transitionTo("idle");
    }
  }

  /**
   * Flush filesystem buffers to ensure data reaches R2.
   */
  private async flushFilesystem(): Promise<void> {
    if (!this.sandbox) return;

    try {
      const flushResult = await this.sandbox.exec("sync");
      console.log("[SyncManager] Filesystem flush:", {
        stdout: flushResult.stdout.trim(),
        stderr: flushResult.stderr.trim(),
      });
    } catch (error) {
      console.warn("[SyncManager] Filesystem flush failed:", error);
      // Non-fatal, continue anyway
    }
  }

  /**
   * Resolve all pending promises with the given result.
   */
  private resolvePending(result: SyncResult): void {
    const resolvers = this.pendingResolvers;
    this.pendingResolvers = [];

    for (const { resolve } of resolvers) {
      resolve(result);
    }
  }
}
