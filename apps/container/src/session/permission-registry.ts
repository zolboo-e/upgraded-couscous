import type { WebSocket } from "ws";
import type { Logger } from "../types/index.js";

export interface PermissionResponseData {
  readonly decision: "allow" | "deny";
  readonly modifiedInput?: Record<string, unknown>;
  readonly message?: string;
}

interface PendingRequest {
  readonly ws: WebSocket;
  readonly resolve: (response: PermissionResponseData) => void;
  readonly reject: (error: Error) => void;
  readonly removeAbortListener: () => void;
}

/**
 * Manages pending permission requests as Promises.
 * The canUseTool callback registers a request and awaits the Promise.
 * The permission_response handler resolves it.
 */
export class PermissionRegistry {
  private pending = new Map<string, PendingRequest>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a pending permission request.
   * Returns a Promise that resolves when the frontend responds.
   */
  register(requestId: string, ws: WebSocket, signal: AbortSignal): Promise<PermissionResponseData> {
    return new Promise<PermissionResponseData>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("Permission request aborted"));
        return;
      }

      const onAbort = (): void => {
        this.pending.delete(requestId);
        reject(new Error("Permission request aborted"));
      };

      signal.addEventListener("abort", onAbort, { once: true });

      this.pending.set(requestId, {
        ws,
        resolve,
        reject,
        removeAbortListener: () => signal.removeEventListener("abort", onAbort),
      });
    });
  }

  /**
   * Resolve a pending permission request with the frontend's response.
   * Returns true if the request was found, false otherwise.
   */
  resolve(requestId: string, response: PermissionResponseData): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) {
      return false;
    }

    this.pending.delete(requestId);
    entry.removeAbortListener();
    entry.resolve(response);
    return true;
  }

  /**
   * Reject all pending requests for a given WebSocket (e.g., on disconnect).
   */
  cleanupForSocket(ws: WebSocket): void {
    const toRemove: string[] = [];

    for (const [requestId, entry] of this.pending) {
      if (entry.ws === ws) {
        toRemove.push(requestId);
      }
    }

    for (const requestId of toRemove) {
      const entry = this.pending.get(requestId);
      if (entry) {
        this.pending.delete(requestId);
        entry.removeAbortListener();
        entry.reject(new Error("WebSocket disconnected"));
        this.logger.info("Permission request cancelled (disconnect)", { requestId });
      }
    }
  }

  get size(): number {
    return this.pending.size;
  }
}
