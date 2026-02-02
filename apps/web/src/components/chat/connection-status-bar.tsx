"use client";

import { ConnectionStatus, type ConnectionStatusValue } from "./connection-status";

export type WebApiStatus = "connected" | "disconnected" | "connecting";
export type ApiSandboxStatus = "connected" | "disconnected" | "not_configured" | "unknown";

interface ConnectionStatusBarProps {
  webApiStatus: WebApiStatus;
  apiSandboxStatus: ApiSandboxStatus;
}

export function ConnectionStatusBar({
  webApiStatus,
  apiSandboxStatus,
}: ConnectionStatusBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">API:</span>
        <ConnectionStatus status={webApiStatus as ConnectionStatusValue} showLabel={false} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Sandbox:</span>
        <ConnectionStatus status={apiSandboxStatus as ConnectionStatusValue} showLabel={false} />
      </div>
    </div>
  );
}
