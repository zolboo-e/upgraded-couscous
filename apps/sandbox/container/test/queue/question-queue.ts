import type { Question } from "./types";

interface PendingQuestion {
  id: string;
  chatId: string;
  questions: Question[];
  resolve: (answers: Record<string, string>) => void;
  createdAt: number;
}

class QuestionQueue {
  private pending = new Map<string, PendingQuestion>();

  add(params: Omit<PendingQuestion, "id" | "createdAt">): string {
    const id = crypto.randomUUID();
    this.pending.set(id, {
      ...params,
      id,
      createdAt: Date.now(),
    });
    console.log(`[QuestionQueue] Added question ${id}`);
    return id;
  }

  get(questionId: string): PendingQuestion | undefined {
    return this.pending.get(questionId);
  }

  getForChat(chatId: string): PendingQuestion | undefined {
    for (const pending of this.pending.values()) {
      if (pending.chatId === chatId) {
        return pending;
      }
    }
    return undefined;
  }

  async resolve(questionId: string, answers: Record<string, string>): Promise<boolean> {
    const pending = this.pending.get(questionId);
    if (!pending) {
      return false;
    }

    this.pending.delete(questionId);
    pending.resolve(answers);
    console.log(`[QuestionQueue] Resolved question ${questionId}`);
    return true;
  }

  cleanup(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, pending] of this.pending.entries()) {
      if (now - pending.createdAt > maxAge) {
        this.pending.delete(id);
        pending.resolve({});
        console.log(`[QuestionQueue] Cleaned up stale question ${id}`);
      }
    }
  }
}

export const questionQueue = new QuestionQueue();
