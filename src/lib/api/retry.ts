import { logger } from '../logger';
import { NetworkError } from '../errors';

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: parseInt(import.meta.env.VITE_MAX_RETRIES || '3', 10),
  delay: 1000,
  backoff: true,
  onRetry: () => {},
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxRetries) {
        logger.error(
          `Operation failed after ${attempt + 1} attempts`,
          lastError
        );
        break;
      }

      const delay = config.backoff
        ? config.delay * Math.pow(2, attempt)
        : config.delay;

      logger.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms`,
        lastError
      );

      config.onRetry(attempt + 1, lastError);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new NetworkError(lastError?.message || 'Operation failed');
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10)
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new NetworkError('Operation timed out')),
        timeoutMs
      )
    ),
  ]);
}
