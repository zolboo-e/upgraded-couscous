"use client";

import { cn } from "@repo/ui";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const statusVariants = cva("inline-flex items-center gap-1.5 text-xs font-medium", {
  variants: {
    status: {
      connected: "text-green-600",
      connecting: "text-yellow-600",
      disconnected: "text-red-600",
      not_configured: "text-gray-500 dark:text-gray-400",
      unknown: "text-gray-500 dark:text-gray-400",
    },
  },
  defaultVariants: {
    status: "unknown",
  },
});

const dotVariants = cva("h-2 w-2 rounded-full", {
  variants: {
    status: {
      connected: "bg-green-500",
      connecting: "bg-yellow-500 animate-pulse",
      disconnected: "bg-red-500",
      not_configured: "bg-gray-400",
      unknown: "bg-gray-400 dark:bg-gray-500",
    },
  },
  defaultVariants: {
    status: "unknown",
  },
});

export type ConnectionStatusValue =
  | "connected"
  | "connecting"
  | "disconnected"
  | "not_configured"
  | "unknown";

export interface ConnectionStatusProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  status: ConnectionStatusValue;
  label?: string;
  showLabel?: boolean;
}

const statusLabels: Record<ConnectionStatusValue, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
  not_configured: "Not configured",
  unknown: "Unknown",
};

const ConnectionStatus = React.forwardRef<HTMLDivElement, ConnectionStatusProps>(
  ({ status, label, showLabel = true, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(statusVariants({ status }), className)} {...props}>
        <span className={dotVariants({ status })} />
        {showLabel && <span>{label ?? statusLabels[status]}</span>}
      </div>
    );
  },
);
ConnectionStatus.displayName = "ConnectionStatus";

export { ConnectionStatus };
