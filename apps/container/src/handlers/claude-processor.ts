import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { WebSocket } from "ws";
import type { Logger } from "../types.js";
import { sendMessage } from "../websocket/send.js";

/**
 * Process messages from Claude Agent SDK
 */
export async function processClaudeMessages(
  ws: WebSocket,
  claudeQuery: AsyncIterable<SDKMessage>,
  sessionId: string | null,
  logger: Logger,
  syncSession: (sessionId: string | null) => Promise<void>,
): Promise<void> {
  let streamStarted = false;

  try {
    logger.info("Starting Claude query processing");
    for await (const message of claudeQuery) {
      // Check if WebSocket is still open
      if (ws.readyState !== WebSocket.OPEN) {
        logger.info("WebSocket closed, stopping message processing");
        break;
      }

      if (message.type === "result") {
        logger.info("Received SDK result message", message);
      } else {
        logger.debug("Received SDK message", {
          type: message.type,
          subtype: (message as { subtype?: string }).subtype,
        });
      }

      // Handle assistant message content
      if (message.type === "assistant") {
        const content = message.message.content;
        if (Array.isArray(content)) {
          const textContent = content
            .filter((block): block is { type: "text"; text: string } => block.type === "text")
            .map((block) => block.text)
            .join("");

          if (textContent) {
            if (!streamStarted) {
              sendMessage(ws, { type: "stream_start" }, logger);
              streamStarted = true;
            }
            sendMessage(ws, { type: "chunk", content: textContent }, logger);
          }
        }
      }

      // Handle result message
      if (message.type === "result") {
        if (streamStarted) {
          sendMessage(ws, { type: "stream_end" }, logger);
          streamStarted = false;
        }

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
    if (streamStarted) {
      sendMessage(ws, { type: "stream_end" }, logger);
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    sendMessage(ws, { type: "error", message: errorMessage }, logger);
  }
}
