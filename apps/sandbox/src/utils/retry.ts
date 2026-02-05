/**
 * Retry utility with exponential backoff and jitter.
 * Provides reliable retry logic for async operations.
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Execute an async function with exponential backoff retry.
 * Includes jitter to prevent thundering herd.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, shouldRetry } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        // Calculate delay with jitter (±10%)
        const baseDelay = baseDelayMs * 2 ** attempt;
        const jitter = baseDelay * 0.1 * (Math.random() * 2 - 1);
        const delay = Math.min(baseDelay + jitter, maxDelayMs);

        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Retry failed with unknown error");
}

/**
 * Check if an HTTP error is retryable (server errors and rate limiting).
 */
export function isRetryableHttpError(status: number): boolean {
  return status >= 500 || status === 429 || status === 408;
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
