"use client";

import type { PermissionRequestContent } from "@/lib/api/chat";

interface PermissionRequestMessageProps {
  content: PermissionRequestContent;
}

function getToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    Read: "Read a file from the filesystem",
    Write: "Write content to a file",
    Edit: "Edit an existing file",
    Bash: "Execute a shell command",
    Glob: "Search for files by pattern",
    Grep: "Search file contents",
    WebFetch: "Fetch content from a URL",
  };
  return descriptions[toolName] ?? `Execute the ${toolName} tool`;
}

export function PermissionRequestMessage({
  content,
}: PermissionRequestMessageProps): React.ReactElement {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-amber-500">⚠️</span>
          <span className="text-sm font-medium">Tool Permission Requested</span>
        </div>
        <p className="text-sm font-semibold">{content.toolName}</p>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {getToolDescription(content.toolName)}
        </p>
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(content.toolInput, null, 2)}
        </pre>
      </div>
    </div>
  );
}
