"use client";

import { ConnectionStatus, type ConnectionStatusValue } from "./connection-status";
import { SessionRestoreStatus, type SessionRestoreStatusValue } from "./session-restore-status";
import type { MemoryStats } from "./stream-types";

export type ServerStatus = "connected" | "disconnected" | "connecting";
export type AgentStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "not_configured"
  | "unknown";

interface ConnectionStatusBarProps {
  serverStatus: ServerStatus;
  agentStatus: AgentStatus;
  sessionRestoreStatus: SessionRestoreStatusValue;
  memoryStats: MemoryStats | null;
}

export function ConnectionStatusBar({
  serverStatus,
  agentStatus,
  sessionRestoreStatus,
  memoryStats,
}: ConnectionStatusBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Server:</span>
        <ConnectionStatus status={serverStatus as ConnectionStatusValue} showLabel={false} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Agent:</span>
        <ConnectionStatus status={agentStatus as ConnectionStatusValue} showLabel={false} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Session:</span>
        <SessionRestoreStatus status={sessionRestoreStatus} showLabel={false} />
      </div>
      {memoryStats && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Memory:</span>
          <span className="font-mono">{memoryStats.rss}MB</span>
        </div>
      )}
    </div>
  );
}
