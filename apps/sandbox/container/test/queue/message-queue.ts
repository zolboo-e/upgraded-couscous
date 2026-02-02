import type { QueueItem } from "./types";

class MessageQueue {
  private queues = new Map<string, QueueItem[]>();
  private resolvers = new Map<string, (item: QueueItem) => void>();

  enqueue(item: QueueItem): void {
    const chatId = item.chatId;
    console.log(`[Queue] Enqueuing message for chat ${chatId}`);

    const resolver = this.resolvers.get(chatId);
    if (resolver) {
      resolver(item);
      this.resolvers.delete(chatId);
    } else {
      const queue = this.queues.get(chatId) || [];
      queue.push(item);
      this.queues.set(chatId, queue);
    }
  }

  async *consume(chatId: string): AsyncGenerator<QueueItem> {
    while (true) {
      let item: QueueItem;

      const queue = this.queues.get(chatId);
      const shifted = queue?.shift();
      if (shifted !== undefined) {
        item = shifted;
      } else {
        item = await new Promise<QueueItem>((resolve) => {
          this.resolvers.set(chatId, resolve);
        });
      }
      if (queue?.length === 0) {
        this.queues.delete(chatId);
      }

      console.log(`[Queue] Dequeuing message for chat ${chatId}`);
      yield item;
    }
  }

  size(chatId?: string): number {
    if (chatId) {
      return this.queues.get(chatId)?.length || 0;
    }
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  hasActiveConsumer(chatId: string): boolean {
    return this.resolvers.has(chatId);
  }
}

export const messageQueue = new MessageQueue();
