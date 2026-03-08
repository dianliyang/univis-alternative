export interface RetryOptions {
  maxAttempts?: number;
  shouldRetry?: (error: unknown) => boolean;
  delayMs?: number;
  delay?: (ms: number) => Promise<void>;
}

export async function retryAsync<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const shouldRetry = options.shouldRetry ?? (() => false);
  const delayMs = options.delayMs ?? 1000;
  const delay = options.delay ?? defaultDelay;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 250);
      await delay(delayMs * 2 ** (attempt - 1) + jitter);
    }
  }

  throw lastError;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
