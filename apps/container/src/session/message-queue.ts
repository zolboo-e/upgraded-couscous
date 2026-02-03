import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { WebSocket } from "ws";
import type { Logger } from "../types.js";

/**
 * Manages per-session infinite message queues.
 * Each WebSocket gets its own queue that stays alive until the connection closes.
 */
export class SessionMessageQueue {
  private queues = new Map<WebSocket, SDKUserMessage[]>();
  private resolvers = new Map<WebSocket, (msg: SDKUserMessage) => void>();
  private closed = new Set<WebSocket>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  enqueue(ws: WebSocket, msg: SDKUserMessage): void {
    if (this.closed.has(ws)) {
      this.logger.debug("Ignoring message for closed session");
      return;
    }

    const resolver = this.resolvers.get(ws);
    if (resolver) {
      resolver(msg);
      this.resolvers.delete(ws);
    } else {
      const queue = this.queues.get(ws) || [];
      queue.push(msg);
      this.queues.set(ws, queue);
    }
  }

  async *consume(ws: WebSocket): AsyncGenerator<SDKUserMessage> {
    while (!this.closed.has(ws)) {
      const queue = this.queues.get(ws);
      const msg = queue?.shift();
      if (msg !== undefined) {
        yield msg;
      } else {
        try {
          const nextMsg = await new Promise<SDKUserMessage>((resolve, reject) => {
            // Check if closed while waiting
            if (this.closed.has(ws)) {
              reject(new Error("Session closed"));
              return;
            }
            this.resolvers.set(ws, resolve);
          });
          yield nextMsg;
        } catch {
          // Session was closed while waiting
          break;
        }
      }
    }
    this.logger.debug("Message queue consumer exited");
  }

  cleanup(ws: WebSocket): void {
    this.closed.add(ws);
    // Reject any pending resolver to unblock the consumer
    const resolver = this.resolvers.get(ws);
    if (resolver) {
      // Resolve with a dummy message that will be ignored due to closed check
      this.resolvers.delete(ws);
    }
    this.queues.delete(ws);
    // Allow cleanup to be called multiple times safely
    setTimeout(() => this.closed.delete(ws), 1000);
  }
}
