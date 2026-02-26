import { withMiniAppSdk, withMiniAppSdkSafe } from './farcasterSdk';

type MiniAppEmbeds = [] | [string] | [string, string];

type ComposeCastInput = {
  text: string;
  embeds?: MiniAppEmbeds;
  channelKey?: string;
};

type SwapTokenInput = {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
};

function ignoreMiniAppErrors(): void {
  // Ignore errors outside mini app context.
}

export async function composeMiniAppCast(input: ComposeCastInput) {
  return withMiniAppSdk((sdk) => sdk.actions.composeCast(input));
}

export async function addMiniApp() {
  return withMiniAppSdk((sdk) => sdk.actions.addMiniApp());
}

export async function getMiniAppClientFid(): Promise<number> {
  return withMiniAppSdk(async (sdk) => {
    const context = await sdk.context;
    return context.client.clientFid;
  });
}

export function composeMiniAppCastSafe(input: ComposeCastInput): void {
  void composeMiniAppCast(input).catch(ignoreMiniAppErrors);
}

export function openMiniAppUrl(url: string): void {
  withMiniAppSdkSafe((sdk) => {
    sdk.actions.openUrl({ url });
  });
}

export function viewMiniAppProfile(fid: number): void {
  withMiniAppSdkSafe((sdk) => {
    sdk.actions.viewProfile({ fid });
  });
}

export function viewMiniAppCast(hash: string): void {
  withMiniAppSdkSafe((sdk) => {
    sdk.actions.viewCast({ hash });
  });
}

export function swapMiniAppToken(input: SwapTokenInput): void {
  withMiniAppSdkSafe((sdk) => {
    sdk.actions.swapToken(input);
  });
}
