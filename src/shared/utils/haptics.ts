import { withMiniAppSdkSafe } from "./farcasterSdk";

export function triggerSelectionHaptic(): void {
  withMiniAppSdkSafe((sdk) => {
    sdk.haptics.selectionChanged();
  });
}

export function triggerNotificationHaptic(
  type: "success" | "warning" | "error"
): void {
  withMiniAppSdkSafe((sdk) => {
    sdk.haptics.notificationOccurred(type);
  });
}

export function triggerImpactHaptic(type: "light" | "medium" | "heavy"): void {
  withMiniAppSdkSafe((sdk) => {
    sdk.haptics.impactOccurred(type);
  });
}
