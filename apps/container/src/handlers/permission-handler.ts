import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { WebSocket } from "ws";
import type { PermissionRegistry } from "../session/permission-registry.js";
import type { Logger } from "../types/index.js";
import { sendMessage } from "../websocket/send.js";

export type CanUseToolFn = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    toolUseID: string;
    suggestions?: unknown[];
    blockedPath?: string;
    decisionReason?: string;
    agentID?: string;
  },
) => Promise<PermissionResult>;

/**
 * Creates a canUseTool callback that routes permission requests
 * to the frontend via WebSocket and awaits the response.
 */
export function createCanUseTool(
  ws: WebSocket,
  registry: PermissionRegistry,
  logger: Logger,
): CanUseToolFn {
  return async (toolName, input, options): Promise<PermissionResult> => {
    const requestId = options.toolUseID;

    logger.info("Permission request", { toolName, requestId });

    const sent = sendMessage(
      ws,
      {
        type: "tool_permission_request",
        requestId,
        toolName,
        toolInput: input,
      },
      logger,
    );

    if (!sent) {
      logger.error("Failed to send permission request, WebSocket not open");
      return {
        behavior: "deny",
        message: "WebSocket disconnected during permission request",
        toolUseID: requestId,
      };
    }

    try {
      const response = await registry.register(requestId, ws, options.signal);

      if (response.decision === "allow") {
        return {
          behavior: "allow",
          updatedInput: response.modifiedInput,
          toolUseID: requestId,
        };
      }

      return {
        behavior: "deny",
        message: response.message ?? "Permission denied by user",
        toolUseID: requestId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Permission request failed";
      logger.error("Permission request error", { requestId, error: errorMessage });
      return {
        behavior: "deny",
        message: errorMessage,
        toolUseID: requestId,
      };
    }
  };
}
