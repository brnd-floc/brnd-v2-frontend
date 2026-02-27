import { formatUnits } from 'viem';

export type ShareBrand = {
  profile?: string;
  channel?: string;
  name?: string;
};

export const getClaimAmountLabel = (amountWei?: string) => {
  if (!amountWei) return null;
  const amount = parseFloat(formatUnits(BigInt(amountWei), 18));
  return amount.toFixed(0);
};

export const getProfileOrChannel = (brand: ShareBrand) => {
  if (brand?.profile) {
    const profile = brand.profile;
    return profile.startsWith('@') ? profile : `@${profile}`;
  }

  if (brand?.channel) {
    const channel = brand.channel;
    return channel.startsWith('/') ? channel : `/${channel}`;
  }

  return brand?.name;
};

export const buildShareCastText = (currentBrands: ShareBrand[]) => {
  const formattedBrand1 = getProfileOrChannel(currentBrands[1] || {});
  const formattedBrand2 = getProfileOrChannel(currentBrands[0] || {});
  const formattedBrand3 = getProfileOrChannel(currentBrands[2] || {});

  return `I just created my @brnd podium of today:\n\n🥇${
    currentBrands[1]?.name || ''
  } ${formattedBrand1 ? `- ${formattedBrand1}` : ''}\n🥈${
    currentBrands[0]?.name || ''
  } ${formattedBrand2 ? `- ${formattedBrand2}` : ''}\n🥉${
    currentBrands[2]?.name || ''
  } ${formattedBrand3 ? `- ${formattedBrand3}` : ''}`;
};

export const getShareButtonState = ({
  isSharing,
  isVerifying,
  claimAmountWei,
  isClaiming,
  isClaimPending,
  isClaimConfirming,
  hasSharedManually,
  isFarcasterClient,
}: {
  isSharing: boolean;
  isVerifying: boolean;
  claimAmountWei?: string;
  isClaiming: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  hasSharedManually: boolean;
  isFarcasterClient: boolean | null;
}) => {
  if (isSharing) return 'Sharing...';
  if (isVerifying) return 'Verifying Share';
  if (claimAmountWei) {
    const amount = getClaimAmountLabel(claimAmountWei);
    return `Claim ${amount} $BRND`;
  }
  if (isClaiming || isClaimPending || isClaimConfirming) {
    if (isClaimPending) return '⏳ Confirm in wallet...';
    if (isClaimConfirming) return '🔄 Processing...';
    return 'Claiming...';
  }
  if (hasSharedManually && isFarcasterClient !== true) return 'Verify Share';
  return 'Share now';
};

export type SharePrimaryAction = 'share' | 'manual-verify' | 'claim';

export const shouldRenderShareLoadingState = (currentBrands?: ShareBrand[]) =>
  !currentBrands || currentBrands.length < 3;

export const getSharePrimaryAction = ({
  hasClaimData,
  isVerifying,
  hasSharedManually,
  isFarcasterClient,
}: {
  hasClaimData: boolean;
  isVerifying: boolean;
  hasSharedManually: boolean;
  isFarcasterClient: boolean | null;
}): SharePrimaryAction => {
  if (hasClaimData && !isVerifying) return 'claim';
  if (hasSharedManually && isFarcasterClient !== true) return 'manual-verify';
  return 'share';
};

export const getShareUiState = ({
  isSharing,
  isVerifying,
  isClaiming,
  isClaimPending,
  isClaimConfirming,
  hasClaimData,
  hasSharedManually,
  isFarcasterClient,
}: {
  isSharing: boolean;
  isVerifying: boolean;
  isClaiming: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  hasClaimData: boolean;
  hasSharedManually: boolean;
  isFarcasterClient: boolean | null;
}) => {
  const isLoading =
    isSharing || isVerifying || isClaiming || isClaimPending || isClaimConfirming;
  const primaryAction = getSharePrimaryAction({
    hasClaimData,
    isVerifying,
    hasSharedManually,
    isFarcasterClient,
  });

  const showShareIcon = !isLoading && primaryAction === 'share';
  const disablePrimaryButton = isLoading && primaryAction !== 'claim';

  return {
    isLoading,
    primaryAction,
    showShareIcon,
    disablePrimaryButton,
  };
};

export const getShareActionViewModel = ({
  isSharing,
  isVerifying,
  isClaiming,
  isClaimPending,
  isClaimConfirming,
  hasClaimData,
  hasSharedManually,
  isFarcasterClient,
  claimAmountWei,
}: {
  isSharing: boolean;
  isVerifying: boolean;
  isClaiming: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  hasClaimData: boolean;
  hasSharedManually: boolean;
  isFarcasterClient: boolean | null;
  claimAmountWei?: string;
}) => {
  const uiState = getShareUiState({
    isSharing,
    isVerifying,
    isClaiming,
    isClaimPending,
    isClaimConfirming,
    hasClaimData,
    hasSharedManually,
    isFarcasterClient,
  });

  return {
    uiState,
    buttonCaption: getShareButtonState({
      isSharing,
      isVerifying,
      claimAmountWei,
      isClaiming,
      isClaimPending,
      isClaimConfirming,
      hasSharedManually,
      isFarcasterClient,
    }),
  };
};

export type ShareActionState = ReturnType<typeof getShareActionViewModel>;

export const getShareActionState = getShareActionViewModel;

export const getShareFeedbackState = ({
  isFarcasterClient,
  hasSharedManually,
  isVerifying,
  manualVerificationMessageDisplay,
  claimAmountLabel,
  hasClaimData,
  isClaiming,
  isClaimPending,
  isClaimConfirming,
  claimError,
  shareError,
}: {
  isFarcasterClient: boolean | null;
  hasSharedManually: boolean;
  isVerifying: boolean;
  manualVerificationMessageDisplay: boolean;
  claimAmountLabel: string | null;
  hasClaimData: boolean;
  isClaiming: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  claimError?: string | null;
  shareError?: string | null;
}) => ({
  isFarcasterClient,
  hasSharedManually,
  isVerifying,
  manualVerificationMessageDisplay,
  claimAmountLabel,
  hasClaimData,
  isClaiming,
  isClaimPending,
  isClaimConfirming,
  claimError,
  shareError,
});

export const getShareRecoveryState = ({
  manualVerificationMessageDisplay,
  claimData,
  isWalletMismatch,
}: {
  manualVerificationMessageDisplay: boolean;
  claimData: unknown | null;
  isWalletMismatch: boolean;
}) => ({
  showManualVerifyButton: manualVerificationMessageDisplay,
  showWalletWarning: Boolean(claimData) && isWalletMismatch,
});

export const getShareErrorMessage = (
  error: unknown,
  fallbackMessage: string
) => (error instanceof Error ? error.message : fallbackMessage);
