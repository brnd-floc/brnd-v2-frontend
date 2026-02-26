import { formatUnits } from 'viem';

export const getAlreadySharedButtonState = ({
  isLoadingClaimData,
  isClaimPending,
  isClaimConfirming,
  isClaiming,
  claimAmountWei,
}: {
  isLoadingClaimData: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  isClaiming: boolean;
  claimAmountWei?: string;
}) => {
  if (isLoadingClaimData) return 'Authorizing...';
  if (isClaimPending) return 'Confirm in wallet...';
  if (isClaimConfirming) return 'Processing...';
  if (isClaiming) return 'Claiming...';
  if (claimAmountWei) {
    const claimAmount = parseFloat(formatUnits(BigInt(claimAmountWei), 18));
    return `Claim ${claimAmount.toFixed(0)} $BRND`;
  }
  return 'Claim Rewards';
};

export const shouldRenderAlreadySharedLoadingState = ({
  hasCurrentBrands,
  hasCurrentVoteId,
}: {
  hasCurrentBrands: boolean;
  hasCurrentVoteId: boolean;
}) => !hasCurrentBrands || !hasCurrentVoteId;

export const getAlreadySharedHasClaimed = ({
  hasClaimedToday,
  contextualTransactionType,
  contextualTransactionHash,
  hasSharedToday,
}: {
  hasClaimedToday?: boolean;
  contextualTransactionType?: string | null;
  contextualTransactionHash?: string | null;
  hasSharedToday?: boolean;
}) =>
  Boolean(
    hasClaimedToday ||
      (contextualTransactionType === 'claim' &&
        contextualTransactionHash &&
        hasSharedToday)
  );

export const getAlreadySharedUiState = ({
  hasClaimData,
  isLoadingClaimData,
  isClaiming,
  isClaimPending,
  isClaimConfirming,
  hasClaimed,
}: {
  hasClaimData: boolean;
  isLoadingClaimData: boolean;
  isClaiming: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  hasClaimed: boolean;
}) => {
  const isLoading =
    isLoadingClaimData || isClaiming || isClaimPending || isClaimConfirming;
  const showReady = hasClaimData && !isLoading;
  const buttonDisabled = isLoading || hasClaimed;

  return {
    isLoading,
    showReady,
    buttonDisabled,
  };
};

export const getAlreadySharedActionViewModel = ({
  isLoadingClaimData,
  isClaimPending,
  isClaimConfirming,
  isClaiming,
  claimAmountWei,
  hasClaimData,
  hasClaimed,
}: {
  isLoadingClaimData: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  isClaiming: boolean;
  claimAmountWei?: string;
  hasClaimData: boolean;
  hasClaimed: boolean;
}) => {
  const uiState = getAlreadySharedUiState({
    hasClaimData,
    isLoadingClaimData,
    isClaiming,
    isClaimPending,
    isClaimConfirming,
    hasClaimed,
  });

  return {
    uiState,
    buttonCaption: getAlreadySharedButtonState({
      isLoadingClaimData,
      isClaimPending,
      isClaimConfirming,
      isClaiming,
      claimAmountWei,
    }),
  };
};

export type AlreadySharedClaimState = ReturnType<
  typeof getAlreadySharedActionViewModel
>;

export const getAlreadySharedClaimState = getAlreadySharedActionViewModel;

export const getAlreadySharedVisibilityState = ({
  isWalletMismatch,
  rewardRecipient,
}: {
  isWalletMismatch: boolean;
  rewardRecipient?: `0x${string}`;
}) => ({
  showWalletInfo: isWalletMismatch && Boolean(rewardRecipient),
});

export const getAlreadySharedFeedbackState = ({
  transactionHash,
  claimAmountWei,
  showReady,
  claimError,
  contractError,
}: {
  transactionHash?: string;
  claimAmountWei?: string;
  showReady: boolean;
  claimError?: string | null;
  contractError?: string | null;
}) => ({
  transactionHash,
  claimAmountWei,
  showReady,
  claimError,
  contractError,
});

export type AlreadySharedFeedbackState = ReturnType<
  typeof getAlreadySharedFeedbackState
>;

export const getAlreadySharedErrorMessage = (
  error: unknown,
  fallbackMessage: string
) => (error instanceof Error ? error.message : fallbackMessage);
