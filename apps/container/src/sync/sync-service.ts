import type { ExecFn, Logger } from "../types.js";

/**
 * Sync session files to persistent R2 storage
 */
export async function syncSessionToPersistent(
  sessionId: string | null,
  execFn: ExecFn,
  logger: Logger,
  environment: string | undefined,
): Promise<void> {
  if (environment !== "production") {
    logger.debug("Session sync skipped (not production)");
    return;
  }

  if (!sessionId) {
    logger.debug("Session sync skipped (no sessionId)");
    return;
  }

  const targetBase = `/persistent/${sessionId}/.claude`;
  logger.info("Starting background sync to persistent storage", { sessionId });

  // Ensure target directories exist, then run rsync in background with --update
  execFn(`mkdir -p ${targetBase}/projects ${targetBase}/todos`)
    .then(() => {
      // Run rsync in background with --update (skip newer files on destination)
      const projectsStart = Date.now();
      execFn(`rsync -a /root/.claude/projects/ ${targetBase}/projects/`)
        .then(() =>
          logger.info("Rsync projects completed", {
            sessionId,
            durationMs: Date.now() - projectsStart,
          }),
        )
        .catch((error) =>
          logger.error("Rsync projects failed", {
            sessionId,
            durationMs: Date.now() - projectsStart,
            error: error instanceof Error ? error.message : error,
          }),
        );

      const todosStart = Date.now();
      execFn(`rsync -a /root/.claude/todos/ ${targetBase}/todos/`)
        .then(() =>
          logger.info("Rsync todos completed", { sessionId, durationMs: Date.now() - todosStart }),
        )
        .catch((error) =>
          logger.error("Rsync todos failed", {
            sessionId,
            durationMs: Date.now() - todosStart,
            error: error instanceof Error ? error.message : error,
          }),
        );

      logger.info("Background rsync started", { sessionId });
    })
    .catch((error) => {
      logger.error(
        "Failed to create sync directories",
        error instanceof Error ? error.message : error,
      );
    });
}
