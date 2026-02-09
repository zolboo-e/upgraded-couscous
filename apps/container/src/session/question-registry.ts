import type { WebSocket } from "ws";
import type { Logger } from "../types/index.js";

export interface QuestionAnswerData {
  readonly answers: Record<string, string>;
}

interface PendingQuestion {
  readonly ws: WebSocket;
  readonly resolve: (response: QuestionAnswerData) => void;
  readonly reject: (error: Error) => void;
  readonly removeAbortListener: () => void;
}

/**
 * Manages pending AskUserQuestion requests as Promises.
 * The canUseTool callback registers a request and awaits the Promise.
 * The ask_user_answer handler resolves it.
 */
export class QuestionRegistry {
  private pending = new Map<string, PendingQuestion>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a pending question request.
   * Returns a Promise that resolves when the frontend responds with answers.
   */
  register(requestId: string, ws: WebSocket, signal: AbortSignal): Promise<QuestionAnswerData> {
    return new Promise<QuestionAnswerData>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("Question request aborted"));
        return;
      }

      const onAbort = (): void => {
        this.pending.delete(requestId);
        reject(new Error("Question request aborted"));
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
   * Resolve a pending question with the user's answers.
   * Returns true if the request was found, false otherwise.
   */
  resolve(requestId: string, answers: Record<string, string>): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) {
      return false;
    }

    this.pending.delete(requestId);
    entry.removeAbortListener();
    entry.resolve({ answers });
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
        this.logger.info("Question request cancelled (disconnect)", { requestId });
      }
    }
  }

  get size(): number {
    return this.pending.size;
  }
}
