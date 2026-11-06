type ApiErrorDetails = { message?: unknown; code?: unknown; retryable?: unknown };

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryable?: boolean,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export const getApiResponseError = (status: number, statusText: string, payload: unknown) => {
  const envelope = payload && typeof payload === 'object'
    ? payload as { data?: unknown } & ApiErrorDetails : null;
  const details = envelope?.data && typeof envelope.data === 'object'
    ? envelope.data as ApiErrorDetails : envelope;
  const message = typeof details?.message === 'string'
    ? details.message : typeof envelope?.data === 'string' ? envelope.data :
      `Request failed (${status}${statusText ? ` ${statusText}` : ''}). Please retry.`;
  return new ApiRequestError(
    message,
    status,
    typeof details?.code === 'string' ? details.code : undefined,
    typeof details?.retryable === 'boolean' ? details.retryable : undefined,
  );
};
