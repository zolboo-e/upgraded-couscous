export interface SyncResult {
  success: boolean;
  files: string[];
  error?: string;
  direction: "from_r2" | "to_r2";
}

export interface SessionSyncHooks {
  onSessionStart: (chatId: string) => Promise<SyncResult>;
  onSessionEnd: (chatId: string) => Promise<void>;
  onStreamComplete: (chatId: string) => Promise<void>;
}
