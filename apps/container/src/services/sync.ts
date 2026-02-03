import { isProduction, SYNC_CONFIG } from "../config/index.js";
import type { ExecFn, Logger } from "../types/index.js";

/**
 * Sync session files to persistent R2 storage
 */
export async function syncSessionToPersistent(
  sessionId: string | null,
  execFn: ExecFn,
  logger: Logger,
): Promise<void> {
  if (!isProduction()) {
    logger.debug("Session sync skipped (not production)");
    return;
  }

  if (!sessionId) {
    logger.debug("Session sync skipped (no sessionId)");
    return;
  }

  const targetBase = `${SYNC_CONFIG.basePath}/${sessionId}/.claude`;
  logger.info("Starting background sync to persistent storage", { sessionId });

  // Ensure target directories exist, then run rsync in background with --update
  execFn(`mkdir -p ${targetBase}/${SYNC_CONFIG.projectsDir} ${targetBase}/${SYNC_CONFIG.todosDir}`)
    .then(() => {
      // Run rsync in background with --update (skip newer files on destination)
      const projectsStart = Date.now();
      execFn(
        `rsync -a ${SYNC_CONFIG.localPath}/${SYNC_CONFIG.projectsDir}/ ${targetBase}/${SYNC_CONFIG.projectsDir}/`,
      )
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
      execFn(
        `rsync -a ${SYNC_CONFIG.localPath}/${SYNC_CONFIG.todosDir}/ ${targetBase}/${SYNC_CONFIG.todosDir}/`,
      )
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
