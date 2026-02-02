import {
  type Options,
  query,
  type SDKMessage,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    toolUseID: string;
  },
) => Promise<PermissionResult>;

export type PermissionResult =
  | { behavior: "allow"; updatedInput: Record<string, unknown> }
  | { behavior: "deny"; message: string };

export const defaultAgentOptions: Options = {
  tools: { type: "preset", preset: "claude_code" },
  allowedTools: ["Read", "Edit", "Glob", "Grep", "Bash", "WebSearch", "WebFetch"],
  permissionMode: "default",
};

export { query };
export type { Options, SDKMessage, SDKUserMessage };
