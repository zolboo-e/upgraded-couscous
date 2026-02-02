import type { PermissionResult } from "../claude/client";

interface PendingPermission {
  id: string;
  chatId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseID: string;
  resolve: (result: PermissionResult) => void;
  createdAt: number;
}

class PermissionQueue {
  private pending = new Map<string, PendingPermission>();

  add(params: Omit<PendingPermission, "id" | "createdAt">): string {
    const id = crypto.randomUUID();
    this.pending.set(id, {
      ...params,
      id,
      createdAt: Date.now(),
    });
    console.log(`[PermissionQueue] Added permission request ${id} for tool ${params.toolName}`);
    return id;
  }

  get(permissionId: string): PendingPermission | undefined {
    return this.pending.get(permissionId);
  }

  getForChat(chatId: string): PendingPermission | undefined {
    for (const pending of this.pending.values()) {
      if (pending.chatId === chatId) {
        return pending;
      }
    }
    return undefined;
  }

  async resolve(permissionId: string, result: PermissionResult): Promise<boolean> {
    const pending = this.pending.get(permissionId);
    if (!pending) {
      return false;
    }

    this.pending.delete(permissionId);
    pending.resolve(result);
    console.log(`[PermissionQueue] Resolved permission ${permissionId} with ${result.behavior}`);
    return true;
  }

  cleanup(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, pending] of this.pending.entries()) {
      if (now - pending.createdAt > maxAge) {
        this.pending.delete(id);
        pending.resolve({ behavior: "deny", message: "Permission request timed out" });
        console.log(`[PermissionQueue] Cleaned up stale permission ${id}`);
      }
    }
  }
}

export const permissionQueue = new PermissionQueue();
