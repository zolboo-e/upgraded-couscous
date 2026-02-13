import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { WebSocket } from "ws";
import type { Logger } from "../types/index.js";
import { sendMessage } from "../websocket/send.js";

const NO_CONVERSATION_ERROR = "No conversation found with session ID";

export interface ProcessResult {
  retryWithoutResume: boolean;
}

function isNoConversationError(message: SDKMessage): boolean {
  if (message.type !== "result") return false;
  const result = message as { is_error?: boolean; errors?: string[] };
  return (
    result.is_error === true &&
    (result.errors?.some((e) => e.includes(NO_CONVERSATION_ERROR)) ?? false)
  );
}

/**
 * Process messages from Claude Agent SDK
 * Forwards raw SDK messages for real-time display
 */
export async function processClaudeMessages(
  ws: WebSocket,
  claudeQuery: AsyncIterable<SDKMessage>,
  sessionId: string | null,
  logger: Logger,
  syncSession: (sessionId: string | null) => Promise<void>,
): Promise<ProcessResult> {
  try {
    logger.info("Starting Claude query processing");

    for await (const message of claudeQuery) {
      // Check if WebSocket is still open
      if (ws.readyState !== WebSocket.OPEN) {
        logger.info("WebSocket closed, stopping message processing");
        break;
      }

      // Detect "No conversation found" error — signal retry instead of forwarding
      if (isNoConversationError(message)) {
        logger.info("Session resume failed: no conversation found", { sessionId });
        return { retryWithoutResume: true };
      }

      logger.debug("Received SDK message", {
        type: message.type,
        subtype: (message as { subtype?: string }).subtype,
      });

      // Forward raw SDK message for real-time display
      sendMessage(ws, { type: "sdk_message", message }, logger);

      // Handle result message for completion
      if (message.type === "result") {
        logger.info("Received SDK result message", message);

        // Sync session files to persistent storage
        await syncSession(sessionId);

        sendMessage(
          ws,
          {
            type: "done",
            metadata: {
              tokensUsed: (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
              stopReason: message.subtype,
            },
          },
          logger,
        );
      }
    }

    logger.info("Claude query completed");
    return { retryWithoutResume: false };
  } catch (error) {
    logger.error("Claude query error", error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes(NO_CONVERSATION_ERROR)) {
      logger.info("Session resume failed (exception): no conversation found", { sessionId });
      return { retryWithoutResume: true };
    }

    sendMessage(ws, { type: "error", message: errorMessage }, logger);
    return { retryWithoutResume: false };
  }
}
