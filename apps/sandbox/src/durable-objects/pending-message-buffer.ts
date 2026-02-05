/**
 * Buffer for messages that arrive when container is disconnected.
 * Supports multiple messages with ordering preservation.
 */

export interface PendingMessage {
  id: string;
  raw: string; // Original message string
  type: string; // Parsed message type
  addedAt: number;
  attempts: number;
}

export interface BufferConfig {
  maxSize: number; // Max messages to buffer
  maxAgeMs: number; // Max age before expiration
}

export const DEFAULT_BUFFER_CONFIG: BufferConfig = {
  maxSize: 100,
  maxAgeMs: 300000, // 5 minutes
};

/**
 * PendingMessageBuffer stores messages when container is disconnected.
 * Preserves ordering and handles expiration.
 */
export class PendingMessageBuffer {
  private messages: PendingMessage[] = [];
  private config: BufferConfig;

  constructor(config: Partial<BufferConfig> = {}) {
    this.config = { ...DEFAULT_BUFFER_CONFIG, ...config };
  }

  /**
   * Add a message to the buffer.
   * Automatically prunes expired messages and respects max size.
   */
  add(raw: string, type: string): void {
    // Remove expired messages first
    this.pruneExpired();

    // Check capacity
    if (this.messages.length >= this.config.maxSize) {
      console.warn("[PendingMessageBuffer] Buffer full, dropping oldest message");
      this.messages.shift();
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.messages.push({
      id,
      raw,
      type,
      addedAt: Date.now(),
      attempts: 0,
    });
  }

  /**
   * Get all pending messages and clear the buffer.
   * Use this when container reconnects.
   */
  drain(): PendingMessage[] {
    this.pruneExpired();
    const messages = this.messages;
    this.messages = [];
    return messages;
  }

  /**
   * Peek at pending messages without removing them.
   */
  peek(): PendingMessage[] {
    this.pruneExpired();
    return [...this.messages];
  }

  /**
   * Check if buffer has any pending messages.
   */
  hasPending(): boolean {
    this.pruneExpired();
    return this.messages.length > 0;
  }

  /**
   * Get current buffer size.
   */
  size(): number {
    this.pruneExpired();
    return this.messages.length;
  }

  /**
   * Mark a message as attempted (for retry tracking).
   */
  markAttempted(id: string): void {
    const msg = this.messages.find((m) => m.id === id);
    if (msg) {
      msg.attempts++;
    }
  }

  /**
   * Remove a specific message (after successful send).
   */
  remove(id: string): void {
    this.messages = this.messages.filter((m) => m.id !== id);
  }

  /**
   * Clear all messages (e.g., on session end).
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Remove expired messages based on maxAgeMs.
   */
  private pruneExpired(): void {
    const cutoff = Date.now() - this.config.maxAgeMs;
    const before = this.messages.length;
    this.messages = this.messages.filter((m) => m.addedAt > cutoff);
    const pruned = before - this.messages.length;
    if (pruned > 0) {
      console.log(`[PendingMessageBuffer] Pruned ${pruned} expired messages`);
    }
  }
}
