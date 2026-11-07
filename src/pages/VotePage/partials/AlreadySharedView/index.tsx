import { useCallback, useState, useEffect, useRef } from 'react';

// Components
import Podium from '@/components/Podium';
import Typography from '@/components/Typography';

import { useAccount, useReadContract } from 'wagmi';
import {
  BRND_SEASON_2_CONFIG,
  BRND_SEASON_2_CONFIG_ABI,
} from '@/config/contracts';

// Hooks
import { useStoriesInMotion } from '@/shared/hooks/contract/useStoriesInMotion';
import { useAuth } from '@/shared/hooks/auth';
import { resolveRewardDay } from '@/shared/providers/authRefresh';

// Types
import { VotingViewProps } from '../../types';

// StyleSheet
import styles from './AlreadySharedView.module.scss';

// Assets
import Logo from '@/assets/images/logo.svg';
import { getMiniAppClientFid } from '@/shared/utils/farcasterActions';
import { triggerNotificationHaptic } from '@/shared/utils/haptics';
import { logFeatureError } from '@/shared/utils/logger';
import {
  isSupersededOperationError,
  RewardAlreadyClaimedError,
} from '@/shared/hooks/contract/useStoriesInMotion.public';
import {
  getAlreadySharedClaimState,
  getAlreadySharedErrorMessage,
  getAlreadySharedFeedbackState,
  getAlreadySharedHasClaimed,
  getAlreadySharedVisibilityState,
  shouldRenderAlreadySharedLoadingState,
} from './viewModel';
import { AlreadySharedStatusPanel } from './AlreadySharedStatusPanel';
import { AlreadySharedClaimAction } from './AlreadySharedClaimAction';
import { AlreadySharedWalletInfo } from './AlreadySharedWalletInfo';

interface AlreadySharedViewProps extends VotingViewProps {}

export default function AlreadySharedView({
  currentBrands,
  currentVoteId,
  transactionHash,
  castHash,
}: AlreadySharedViewProps) {
  const { data: authData, updateAuthData, refetch: refetchAuth } = useAuth();

  const { address: connectedWallet } = useAccount();
  const userFid = authData?.fid ? BigInt(authData.fid) : undefined;

  const { data: authorizedWallets } = useReadContract({
    address: BRND_SEASON_2_CONFIG.CONTRACT,
    abi: BRND_SEASON_2_CONFIG_ABI,
    functionName: 'getUserWallets',
    args: userFid ? [userFid] : undefined,
    query: {
      enabled: !!userFid,
    },
  });

  const rewardRecipient = (authorizedWallets as `0x${string}`[])?.[0];
  const isWalletMismatch =
    rewardRecipient &&
    rewardRecipient.toLowerCase() !== connectedWallet?.toLowerCase();

  const {
    getClaimSignatureForSharedVote,
    executeClaimReward,
    isPending: isClaimPending,
    isConfirming: isClaimConfirming,
    error: contractError,
  } = useStoriesInMotion(
    undefined, // onLevelUpSuccess
    undefined, // onVoteSuccess
    // onClaimSuccess
    async (txData) => {
      triggerNotificationHaptic('success');

      const claimTxHash = txData?.txHash;
      if (!claimTxHash) {
        logFeatureError({
          feature: 'already_shared_view',
          action: 'claim_success',
          error: 'No transaction hash in claim success data',
        });
        setIsClaiming(false);
        setIsLoadingClaimData(false);
        setClaimError(null);
        return;
      }

      // Reset local claiming state immediately
      setIsClaiming(false);
      setIsLoadingClaimData(false);
      setClaimError(null);

      const day = resolveRewardDay(claimData?.day, authData?.todaysVoteStatus?.day);

      // Get reward amount from claimData if available
      const rewardAmount = claimData?.claimSignature?.amount;

      // Optimistically update auth context immediately with claim transaction
      updateAuthData({
        todaysVoteStatus: {
          hasVoted: true,
          hasShared: true,
          hasClaimed: true,
          voteId: currentVoteId || authData?.todaysVoteStatus?.voteId || null,
          castHash: castHash || authData?.todaysVoteStatus?.castHash || null,
          transactionHash:
            transactionHash ||
            authData?.todaysVoteStatus?.transactionHash ||
            null,
          day: day,
        },
        contextualTransaction: {
          transactionHash: claimTxHash,
          transactionType: 'claim',
          rewardAmount: rewardAmount,
          castHash:
            castHash || authData?.todaysVoteStatus?.castHash || undefined,
          day: day,
        },
      });
    }
  );

  const [isLoadingClaimData, setIsLoadingClaimData] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const claimOperationRef = useRef(0);

  const startClaimOperation = useCallback(() => {
    claimOperationRef.current += 1;
    return claimOperationRef.current;
  }, []);

  const isClaimOperationActive = useCallback((operationId: number) => {
    return claimOperationRef.current === operationId;
  }, []);

  const resetClaimLoadingIfActive = useCallback(
    (operationId: number) => {
      if (!isClaimOperationActive(operationId)) {
        return false;
      }
      setIsLoadingClaimData(false);
      setIsClaiming(false);
      return true;
    },
    [isClaimOperationActive]
  );

  const applyClaimErrorIfActive = useCallback(
    (operationId: number, message: string) => {
      if (!resetClaimLoadingIfActive(operationId)) {
        return false;
      }
      setClaimError(message);
      setClaimData(null);
      return true;
    },
    [resetClaimLoadingIfActive]
  );

  // Check if user has claimed - if so, the state machine should transition to State 4
  // This prevents showing claiming UI when we've already transitioned
  const hasClaimed = getAlreadySharedHasClaimed({
    hasClaimedToday: authData?.todaysVoteStatus?.hasClaimed,
    contextualTransactionType: authData?.contextualTransaction?.transactionType,
    contextualTransactionHash: authData?.contextualTransaction?.transactionHash,
    hasSharedToday: authData?.todaysVoteStatus?.hasShared,
  });

  // Reset claiming state if we've transitioned to claimed state
  useEffect(() => {
    if (hasClaimed) {
      setIsClaiming(false);
      setIsLoadingClaimData(false);
      setClaimError(null);
    }
  }, [hasClaimed]);

  const [claimData, setClaimData] = useState<{
    castHash: string;
    claimSignature: {
      signature: string;
      amount: string;
      deadline: number;
      nonce: number;
      canClaim: boolean;
    };
    day: number;
    recipientAddress: string;
  } | null>(null);

  // wagmi reports wallet rejection asynchronously; the awaited mutation can return first.
  useEffect(() => {
    if (contractError && !isClaimPending && !isClaimConfirming) {
      setIsClaiming(false);
      setIsLoadingClaimData(false);
      setClaimData(null);
    }
  }, [contractError, isClaimPending, isClaimConfirming]);

  // Note: Continue button removed as this component is for claiming rewards

  /**
   * Handles the claim reward button click - fetches signature and executes transaction
   */
  const handleClickClaim = useCallback(async () => {
    if (
      hasClaimed || isClaiming ||
      isClaimPending ||
      isClaimConfirming ||
      isLoadingClaimData
    ) {
      return;
    }
    const operationId = startClaimOperation();

    // Recheck eligibility and obtain a fresh signature on every explicit retry.
    if (!currentVoteId) {
      setClaimError('Vote ID is required');
      return;
    }

    setIsLoadingClaimData(true);
    setClaimError(null);

    try {
      const clientFid = await getMiniAppClientFid();

      const result = await getClaimSignatureForSharedVote(
        currentVoteId,
        transactionHash || '',
        rewardRecipient,
        clientFid
      );

      if (result.claimSignature && result.claimSignature.canClaim) {
        if (!isClaimOperationActive(operationId)) {
          return;
        }
        const recipient = rewardRecipient || connectedWallet!;
        const newClaimData = {
          castHash: result.castHash || '',
          claimSignature: result.claimSignature,
          day: result.day,
          recipientAddress: recipient,
        };
        setClaimData(newClaimData);
        setIsLoadingClaimData(false);

        // Immediately execute the claim after getting signature
        setIsClaiming(true);
        await executeClaimReward(
          newClaimData.castHash,
          newClaimData.claimSignature,
          newClaimData.day,
          newClaimData.recipientAddress
        );
      } else {
        throw new Error('Cannot claim - already claimed or not eligible');
      }
    } catch (error: unknown) {
      if (error instanceof RewardAlreadyClaimedError) {
        resetClaimLoadingIfActive(operationId);
        const status = authData?.todaysVoteStatus;
        if (status) updateAuthData({ todaysVoteStatus: {
          ...status, hasVoted: true, hasShared: true, hasClaimed: true,
        } });
        void refetchAuth().catch(() => undefined);
        return;
      }
      if (isSupersededOperationError(error)) {
        resetClaimLoadingIfActive(operationId);
        return;
      }
      const errorMessage = getAlreadySharedErrorMessage(
        error,
        'Failed to get claim signature. Please try again.'
      );
      logFeatureError({
        feature: 'already_shared_view',
        action: 'get_claim_signature',
        error,
      });
      applyClaimErrorIfActive(operationId, errorMessage);
    }
  }, [
    currentVoteId,
    transactionHash,
    getClaimSignatureForSharedVote,
    executeClaimReward,
    isClaiming,
    isClaimPending,
    isClaimConfirming,
    isLoadingClaimData,
    rewardRecipient,
    connectedWallet,
    startClaimOperation,
    isClaimOperationActive,
    resetClaimLoadingIfActive,
    applyClaimErrorIfActive,
    hasClaimed,
    authData,
    updateAuthData,
    refetchAuth,
  ]);

  const alreadySharedActionVm = getAlreadySharedClaimState({
    hasClaimData: Boolean(claimData),
    isLoadingClaimData,
    isClaiming,
    isClaimPending,
    isClaimConfirming,
    hasClaimed,
    claimAmountWei: claimData?.claimSignature.amount,
  });
  const alreadySharedUiState = alreadySharedActionVm.uiState;
  const feedbackState = getAlreadySharedFeedbackState({
    transactionHash,
    claimAmountWei: claimData?.claimSignature.amount,
    showReady: alreadySharedUiState.showReady,
    claimError,
    contractError,
  });
  const visibilityState = getAlreadySharedVisibilityState({
    isWalletMismatch: Boolean(isWalletMismatch),
    rewardRecipient,
  });

  // Show loading state if data is missing
  if (
    shouldRenderAlreadySharedLoadingState({
      hasCurrentBrands: Boolean(currentBrands && currentBrands.length >= 3),
      hasCurrentVoteId: Boolean(currentVoteId),
    })
  ) {
    return (
      <div className={styles.body}>
        <div className={styles.container}>
          <Typography>Loading vote data...</Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <div>
        <div className={styles.center}>
          <img src={Logo} className={styles.logo} alt="Logo" />
        </div>
      </div>
      <div className={styles.container}>
        <Typography
          size={18}
          lineHeight={24}
          variant={'druk'}
          weight={'wide'}
          className={styles.title}
        >
          Already voted and shared!
        </Typography>
      </div>

      <AlreadySharedStatusPanel {...feedbackState} />

      <div className={styles.box}>
        <div className={styles.podium}>
          <Podium
            isAnimated={false}
            variant={'readonly'}
            initial={currentBrands}
          />

          <div className={styles.action}>
            <AlreadySharedClaimAction
              buttonCaption={alreadySharedActionVm.buttonCaption}
              isLoading={alreadySharedUiState.isLoading}
              buttonDisabled={alreadySharedUiState.buttonDisabled}
              onClaim={handleClickClaim}
            />
          </div>
          <AlreadySharedWalletInfo
            isWalletMismatch={visibilityState.showWalletInfo}
            rewardRecipient={rewardRecipient}
          />
        </div>
      </div>
    </div>
  );
}
