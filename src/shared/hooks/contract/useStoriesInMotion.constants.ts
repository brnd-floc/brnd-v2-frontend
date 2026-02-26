export interface StoriesAsyncPolicy {
  timeoutMs: number;
  attempts: number;
  baseDelayMs: number;
  factor: number;
  jitter: boolean;
}

export const STORIES_BACKEND_TIMEOUT_MS = 8000;
export const STORIES_TRANSIENT_MAX_RETRIES = 2;

export const STORIES_TRANSIENT_RETRY_POLICY: StoriesAsyncPolicy = {
  timeoutMs: STORIES_BACKEND_TIMEOUT_MS,
  // 1 initial attempt + 2 retries
  attempts: STORIES_TRANSIENT_MAX_RETRIES + 1,
  baseDelayMs: 250,
  factor: 2,
  jitter: true,
};
