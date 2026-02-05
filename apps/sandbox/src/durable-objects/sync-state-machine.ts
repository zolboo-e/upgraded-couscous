/**
 * Sync state machine for managing R2 synchronization lifecycle.
 * Ensures atomic state transitions and prevents race conditions.
 */

export type SyncState =
  | "idle" // No sync in progress or pending
  | "pending" // Sync requested but debouncing
  | "syncing" // Actively syncing to R2
  | "flushing" // Flushing filesystem buffers
  | "retrying" // Retry in progress after failure
  | "error"; // Terminal error state (requires intervention)

export interface SyncContext {
  state: SyncState;
  pendingCount: number; // Number of sync requests during current sync
  retryCount: number; // Current retry attempt
  lastSyncAt: number | null; // Timestamp of last successful sync
  lastError: string | null; // Last error message for debugging
  debounceTimer: ReturnType<typeof setTimeout> | null; // Active debounce timer
}

export const INITIAL_SYNC_CONTEXT: SyncContext = {
  state: "idle",
  pendingCount: 0,
  retryCount: 0,
  lastSyncAt: null,
  lastError: null,
  debounceTimer: null,
};

/**
 * Valid state transitions for the sync state machine.
 * Prevents invalid states and makes debugging easier.
 */
export const SYNC_TRANSITIONS: Record<SyncState, SyncState[]> = {
  idle: ["pending"],
  pending: ["syncing", "idle"], // idle if debounce cancelled
  syncing: ["flushing", "retrying", "error"],
  flushing: ["idle", "pending", "retrying", "error"], // pending if new sync requested
  retrying: ["syncing", "error"],
  error: ["idle"], // Manual reset or recovery
};

/**
 * Check if a state transition is valid.
 */
export function canTransition(from: SyncState, to: SyncState): boolean {
  return SYNC_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Create a fresh sync context (for initialization or reset).
 */
export function createSyncContext(): SyncContext {
  return { ...INITIAL_SYNC_CONTEXT };
}

/**
 * Configuration for sync operations.
 */
export interface SyncConfig {
  debounceMs: number; // Time to wait before syncing (default: 2000ms)
  maxDebounceMs: number; // Max wait time before forcing sync (default: 10000ms)
  maxRetries: number; // Max retry attempts (default: 3)
  baseRetryDelayMs: number; // Base delay for exponential backoff (default: 1000ms)
  maxRetryDelayMs: number; // Max retry delay cap (default: 30000ms)
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  debounceMs: 2000, // Wait 2s after last "done" before syncing
  maxDebounceMs: 10000, // Force sync after 10s max
  maxRetries: 3,
  baseRetryDelayMs: 1000,
  maxRetryDelayMs: 30000,
};
