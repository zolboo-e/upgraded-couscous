"use client";

import { cn } from "@repo/ui";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

export type SessionRestoreStatusValue =
  | "unknown"
  | "restore_started"
  | "restoring"
  | "restored"
  | "restore_skipped"
  | "restore_failed";

const statusVariants = cva("inline-flex items-center gap-1.5 text-xs font-medium", {
  variants: {
    status: {
      unknown: "text-gray-500 dark:text-gray-400",
      restore_started: "text-yellow-600",
      restoring: "text-yellow-600",
      restored: "text-green-600",
      restore_skipped: "text-blue-600",
      restore_failed: "text-red-600",
    },
  },
  defaultVariants: {
    status: "unknown",
  },
});

const dotVariants = cva("h-2 w-2 rounded-full", {
  variants: {
    status: {
      unknown: "bg-gray-400",
      restore_started: "bg-yellow-500 animate-pulse",
      restoring: "bg-yellow-500 animate-pulse",
      restored: "bg-green-500",
      restore_skipped: "bg-blue-500",
      restore_failed: "bg-red-500",
    },
  },
  defaultVariants: {
    status: "unknown",
  },
});

export interface SessionRestoreStatusProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  status: SessionRestoreStatusValue;
  showLabel?: boolean;
}

const statusLabels: Record<SessionRestoreStatusValue, string> = {
  unknown: "Unknown",
  restore_started: "Starting...",
  restoring: "Restoring...",
  restored: "Restored",
  restore_skipped: "New",
  restore_failed: "Failed",
};

const SessionRestoreStatus = React.forwardRef<HTMLDivElement, SessionRestoreStatusProps>(
  ({ status, showLabel = true, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(statusVariants({ status }), className)} {...props}>
        <span className={dotVariants({ status })} />
        {showLabel && <span>{statusLabels[status]}</span>}
      </div>
    );
  },
);
SessionRestoreStatus.displayName = "SessionRestoreStatus";

export { SessionRestoreStatus };
