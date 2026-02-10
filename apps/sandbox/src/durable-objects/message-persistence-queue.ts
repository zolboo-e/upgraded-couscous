/**
 * MessagePersistenceQueue ensures ordered, reliable message persistence.
 * Messages are processed sequentially to maintain conversation order.
 * Failed messages are retried with exponential backoff.
 */

import { isRetryableHttpError, withRetry } from "../utils/retry.js";

export type PersistenceMessageType =
  | "message"
  | "permission_request"
  | "permission_response"
  | "question"
  | "question_answer";

export interface PersistenceMessage {
  id: string;
  role: "user" | "assistant";
  type?: PersistenceMessageType;
  content: string;
  metadata?: {
    tokensUsed?: number;
    stopReason?: string;
  };
  createdAt: number;
}

export interface PersistenceResult {
  messageId: string | null;
  success: boolean;
  error?: string;
}

export interface PersistenceConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

/**
 * MessagePersistenceQueue handles ordered message persistence to the API.
 * Ensures messages are persisted in order and retries on transient failures.
 */
export class MessagePersistenceQueue {
  private queue: PersistenceMessage[] = [];
  private processing = false;
  private sessionId: string | null = null;
  private apiBaseUrl: string;
  private apiToken: string;
  private config: PersistenceConfig;
  private resultCallbacks = new Map<string, (result: PersistenceResult) => void>();

  constructor(apiBaseUrl: string, apiToken: string, config: Partial<PersistenceConfig> = {}) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiToken = apiToken;
    this.config = { ...DEFAULT_PERSISTENCE_CONFIG, ...config };
  }

  /**
   * Initialize with session ID for API calls.
   */
  initialize(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Enqueue a message for persistence.
   * Returns a promise that resolves when persisted (or fails after retries).
   */
  async enqueue(
    role: "user" | "assistant",
    content: string,
    metadata?: PersistenceMessage["metadata"],
    type?: PersistenceMessageType,
  ): Promise<string | null> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const message: PersistenceMessage = {
      id,
      role,
      type,
      content,
      metadata,
      createdAt: Date.now(),
    };

    return new Promise((resolve) => {
      this.resultCallbacks.set(id, (result) => {
        resolve(result.messageId);
      });

      this.queue.push(message);
      this.processQueue();
    });
  }

  /**
   * Get current queue depth for monitoring.
   */
  getQueueDepth(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is currently processing.
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Wait for all pending messages to be processed.
   */
  async flush(): Promise<void> {
    while (this.processing || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Process messages sequentially from the queue.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue[0];
        if (!message) break;

        try {
          const result = await this.persistWithRetry(message);
          this.queue.shift(); // Remove from queue on success

          const callback = this.resultCallbacks.get(message.id);
          callback?.(result);
          this.resultCallbacks.delete(message.id);
        } catch (error) {
          // After all retries failed, report error and continue
          console.error(
            "[MessagePersistenceQueue] Failed to persist message after retries:",
            error,
          );
          this.queue.shift();

          const callback = this.resultCallbacks.get(message.id);
          callback?.({
            messageId: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          this.resultCallbacks.delete(message.id);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Persist a message with retry logic.
   */
  private async persistWithRetry(message: PersistenceMessage): Promise<PersistenceResult> {
    if (!this.sessionId) {
      return {
        messageId: null,
        success: false,
        error: "Session ID not initialized",
      };
    }

    if (!this.apiBaseUrl || !this.apiToken) {
      console.warn("[MessagePersistenceQueue] API persistence not configured");
      return {
        messageId: null,
        success: false,
        error: "API persistence not configured",
      };
    }

    try {
      const messageId = await withRetry(
        async () => {
          const response = await fetch(
            `${this.apiBaseUrl}/internal/sessions/${this.sessionId}/messages`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Service-Token": this.apiToken,
              },
              body: JSON.stringify({
                role: message.role,
                type: message.type ?? "message",
                content: message.content,
                metadata: message.metadata,
              }),
            },
          );

          if (!response.ok) {
            const error = new Error(`API error: ${response.status}`) as Error & {
              status: number;
            };
            error.status = response.status;

            // Only throw for retryable errors
            if (isRetryableHttpError(response.status)) {
              throw error;
            }

            // Non-retryable error, return null
            console.error("[MessagePersistenceQueue] Non-retryable error:", response.status);
            return null;
          }

          const result = (await response.json()) as { messageId: string };
          return result.messageId;
        },
        {
          maxRetries: this.config.maxRetries,
          baseDelayMs: this.config.baseDelayMs,
          maxDelayMs: this.config.maxDelayMs,
          shouldRetry: (error) => {
            const status = (error as Error & { status?: number }).status;
            return status !== undefined && isRetryableHttpError(status);
          },
        },
      );

      return {
        messageId,
        success: messageId !== null,
      };
    } catch (error) {
      return {
        messageId: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
