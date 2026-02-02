import type { SessionSyncHooks, SyncResult } from "./types";

export function createSessionSyncHooks(): SessionSyncHooks {
  return {
    onSessionStart: async (_chatId: string): Promise<SyncResult> => {
      return { success: true, files: [], direction: "from_r2" };
    },
    onSessionEnd: async (_chatId: string): Promise<void> => {
      // No-op: sync disabled
    },
    onStreamComplete: async (_chatId: string): Promise<void> => {
      // No-op: sync disabled
    },
  };
}
