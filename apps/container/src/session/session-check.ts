import type { ExecFn, Logger } from "../types.js";

/**
 * Check if a session exists on disk
 */
export async function checkSessionExists(
  sessionId: string,
  execFn: ExecFn,
  _logger: Logger,
  retries = 3,
): Promise<boolean> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Check if session file exists in Claude's session storage
      // Claude Agent SDK stores sessions by ID in ~/.claude/
      const result = await execFn(
        `find /root/.claude -name "*${sessionId}*" -type f 2>/dev/null | head -1`,
      );
      if (result.stdout.trim().length > 0) {
        return true;
      }
      // Wait briefly before retry to allow filesystem to settle
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch {
      // Continue to next retry
    }
  }
  return false;
}
