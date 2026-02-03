import { WebSocket } from "ws";
import type { Logger, OutgoingMessage } from "../types.js";

/**
 * Send a message through WebSocket
 */
export function sendMessage(ws: WebSocket, msg: OutgoingMessage, logger: Logger): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(msg);
      logger.info(`OUT: ${json}`);
      ws.send(json);
      return true;
    }
    return false;
  } catch (error) {
    logger.error("Error sending message", error);
    return false;
  }
}
