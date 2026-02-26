import { isAbortLikeError } from './useStoriesInMotion.errors';

export interface StoriesOperationToken {
  id: number;
}

export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getErrorStatus = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status?: number }).status;
  }
  return undefined;
};

const isRetriableHttpStatus = (status?: number) =>
  status === 408 || status === 429 || (status !== undefined && status >= 500);

export const isTransientAsyncError = (error: unknown) => {
  const status = getErrorStatus(error);
  return isAbortLikeError(error) || isRetriableHttpStatus(status);
};

export const retryAsync = async <T>(
  fn: (attempt: number) => Promise<T>,
  options: {
    attempts: number;
    baseDelayMs: number;
    factor: number;
    jitter: boolean;
  }
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const transient = isTransientAsyncError(error);
      const isLastAttempt = attempt === options.attempts;

      if (!transient || isLastAttempt) {
        throw error;
      }

      const expDelay = options.baseDelayMs * options.factor ** (attempt - 1);
      const delay = options.jitter
        ? expDelay + Math.floor(Math.random() * options.baseDelayMs)
        : expDelay;
      await sleep(delay);
    }
  }

  throw lastError;
};
