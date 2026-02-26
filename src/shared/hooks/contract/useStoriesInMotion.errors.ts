export const getStoriesErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const isAbortLikeError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("aborted") ||
    message.includes("timeout") ||
    message.includes("timed out")
  );
};

export const isSupersededOperationError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("superseded by newer operation");
};

export const getStoriesErrorMeta = (error: unknown) => ({
  message: getStoriesErrorMessage(error, "Unknown error"),
  stack: error instanceof Error ? error.stack : undefined,
  name: error instanceof Error ? error.name : undefined,
});

export const getStoriesErrorCause = (error: unknown) => {
  if (typeof error === "object" && error !== null && "cause" in error) {
    return (error as { cause?: unknown }).cause;
  }

  return undefined;
};

export const extractRevertReason = (message: string) => {
  const revertMatch = message.match(/revert reason: (.+)/i);
  return revertMatch?.[1];
};
