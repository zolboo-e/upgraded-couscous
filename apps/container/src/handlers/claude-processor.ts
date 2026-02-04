import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { WebSocket } from "ws";
import type { Logger } from "../types/index.js";
import { sendMessage } from "../websocket/send.js";

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
): Promise<void> {
  try {
    logger.info("Starting Claude query processing");

    for await (const message of claudeQuery) {
      // Check if WebSocket is still open
      if (ws.readyState !== WebSocket.OPEN) {
        logger.info("WebSocket closed, stopping message processing");
        break;
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
  } catch (error) {
    logger.error("Claude query error", error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    sendMessage(ws, { type: "error", message: errorMessage }, logger);
  }
}
