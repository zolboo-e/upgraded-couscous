"use client";

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@repo/ui";

export interface ToolPermissionRequest {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface ToolPermissionResponse {
  requestId: string;
  decision: "allow" | "deny";
  modifiedInput?: Record<string, unknown>;
  message?: string;
}

interface ToolPermissionDialogProps {
  request: ToolPermissionRequest;
  onDecision: (response: ToolPermissionResponse) => void;
}

function formatToolInput(input: Record<string, unknown>): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
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

export function ToolPermissionDialog({
  request,
  onDecision,
}: ToolPermissionDialogProps): React.ReactElement {
  const handleAllow = (): void => {
    onDecision({
      requestId: request.requestId,
      decision: "allow",
    });
  };

  const handleDeny = (): void => {
    onDecision({
      requestId: request.requestId,
      decision: "deny",
      message: "Permission denied by user",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-500">⚠️</span>
            Tool Permission Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Claude wants to use the following tool:</p>
            <p className="mt-1 font-semibold">{request.toolName}</p>
            <p className="text-sm text-muted-foreground">{getToolDescription(request.toolName)}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Input:</p>
            <pre className="rounded-md bg-muted p-3 text-sm overflow-auto max-h-48">
              {formatToolInput(request.toolInput)}
            </pre>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleDeny}>
            Deny
          </Button>
          <Button onClick={handleAllow}>Allow</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
