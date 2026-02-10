"use client";

import { cn } from "@repo/ui";
import type { PermissionResponseContent } from "@/lib/api/chat";

interface PermissionResponseMessageProps {
  content: PermissionResponseContent;
}

export function PermissionResponseMessage({
  content,
}: PermissionResponseMessageProps): React.ReactElement {
  const isAllowed = content.decision === "allow";

  return (
    <div className="flex w-full justify-end">
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isAllowed
            ? "border border-green-200 bg-green-100 dark:border-green-800 dark:bg-green-950"
            : "border border-red-200 bg-red-100 dark:border-red-800 dark:bg-red-950",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={
              isAllowed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
            }
          >
            {isAllowed ? "✓" : "✗"}
          </span>
          <span
            className={cn(
              "text-sm font-medium",
              isAllowed ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300",
            )}
          >
            {isAllowed ? "Permission Granted" : "Permission Denied"}
          </span>
        </div>
      </div>
    </div>
  );
}
