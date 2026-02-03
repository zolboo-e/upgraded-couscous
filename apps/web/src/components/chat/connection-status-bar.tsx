"use client";

import { ConnectionStatus, type ConnectionStatusValue } from "./connection-status";

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
}

export function ConnectionStatusBar({
  serverStatus,
  agentStatus,
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
    </div>
  );
}
