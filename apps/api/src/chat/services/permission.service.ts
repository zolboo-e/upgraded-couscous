import type { PermissionResult, ToolPermissionResponse } from "../types/permission.types.js";

interface PendingRequest {
  resolve: (result: PermissionResult) => void;
  reject: (error: Error) => void;
}

export class PermissionService {
  private pendingRequests = new Map<string, PendingRequest>();

  waitForPermission(requestId: string): Promise<PermissionResult> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
    });
  }

  resolvePermission(requestId: string, response: ToolPermissionResponse): boolean {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return false;
    }

    this.pendingRequests.delete(requestId);

    if (response.decision === "allow") {
      pending.resolve({
        behavior: "allow",
        updatedInput: response.modifiedInput ?? {},
      });
    } else {
      pending.resolve({
        behavior: "deny",
        message: response.message ?? "Permission denied by user",
      });
    }

    return true;
  }

  resolveWithAnswers(requestId: string, answers: Record<string, string>): boolean {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return false;
    }

    this.pendingRequests.delete(requestId);

    pending.resolve({
      behavior: "allow",
      updatedInput: { answers },
    });

    return true;
  }

  cancelAll(reason: string): void {
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error(reason));
      this.pendingRequests.delete(requestId);
    }
  }

  hasPendingRequests(): boolean {
    return this.pendingRequests.size > 0;
  }
}
