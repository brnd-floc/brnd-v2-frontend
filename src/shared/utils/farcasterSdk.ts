let sdkPromise: Promise<
  (typeof import("@farcaster/miniapp-sdk"))["default"]
> | null = null;
let readySignalInFlight: Promise<boolean> | null = null;

export async function getMiniAppSdk() {
  if (!sdkPromise) {
    sdkPromise = import("@farcaster/miniapp-sdk").then((module) => module.default);
  }
  return sdkPromise;
}

export async function withMiniAppSdk<T>(
  operation: (
    sdk: (typeof import("@farcaster/miniapp-sdk"))["default"]
  ) => Promise<T> | T
): Promise<T> {
  const sdk = await getMiniAppSdk();
  return operation(sdk);
}

export function withMiniAppSdkSafe(
  operation: (
    sdk: (typeof import("@farcaster/miniapp-sdk"))["default"]
  ) => Promise<unknown> | unknown
): void {
  void withMiniAppSdk(operation).catch(() => {
    // Ignore errors outside mini app context.
  });
}

export async function signalMiniAppReady({
  retries = 60,
  delayMs = 500,
  maxDelayMs = 1000,
}: {
  retries?: number;
  delayMs?: number;
  maxDelayMs?: number;
} = {}): Promise<boolean> {
  if (readySignalInFlight) {
    return readySignalInFlight;
  }

  readySignalInFlight = (async () => {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const sdk = await getMiniAppSdk();
        await sdk.actions.ready();
        return true;
      } catch {
        if (attempt === retries - 1) {
          return false;
        }

        const retryDelay = Math.min(delayMs + attempt * 50, maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    return false;
  })();

  try {
    return await readySignalInFlight;
  } finally {
    readySignalInFlight = null;
  }
}
