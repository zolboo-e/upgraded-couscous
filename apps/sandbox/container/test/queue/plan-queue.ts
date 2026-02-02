import type { AllowedPrompt } from "./types";

interface PendingPlan {
  id: string;
  chatId: string;
  planContent: string;
  allowedPrompts?: AllowedPrompt[];
  resolve: (approved: boolean) => void;
  createdAt: number;
}

class PlanQueue {
  private pending = new Map<string, PendingPlan>();

  add(params: Omit<PendingPlan, "id" | "createdAt">): string {
    const id = crypto.randomUUID();
    this.pending.set(id, {
      ...params,
      id,
      createdAt: Date.now(),
    });
    console.log(`[PlanQueue] Added plan ${id}`);
    return id;
  }

  get(planId: string): PendingPlan | undefined {
    return this.pending.get(planId);
  }

  getForChat(chatId: string): PendingPlan | undefined {
    for (const pending of this.pending.values()) {
      if (pending.chatId === chatId) {
        return pending;
      }
    }
    return undefined;
  }

  async resolve(planId: string, approved: boolean): Promise<boolean> {
    const pending = this.pending.get(planId);
    if (!pending) {
      return false;
    }

    this.pending.delete(planId);
    pending.resolve(approved);
    console.log(`[PlanQueue] Resolved plan ${planId} with approved=${approved}`);
    return true;
  }

  cleanup(maxAge: number = 10 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, pending] of this.pending.entries()) {
      if (now - pending.createdAt > maxAge) {
        this.pending.delete(id);
        pending.resolve(false);
        console.log(`[PlanQueue] Cleaned up stale plan ${id}`);
      }
    }
  }
}

export const planQueue = new PlanQueue();
