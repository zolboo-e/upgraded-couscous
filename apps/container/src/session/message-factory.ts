import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

/**
 * Create a user message for the Claude Agent SDK
 */
export function createUserMessage(content: string): SDKUserMessage {
  return {
    type: "user",
    session_id: "",
    message: {
      role: "user",
      content: [{ type: "text", text: content }],
    },
    parent_tool_use_id: null,
  };
}
