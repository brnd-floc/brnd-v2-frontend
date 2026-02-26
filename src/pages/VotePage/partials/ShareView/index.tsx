import { useCallback, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAccount, useReadContract } from "wagmi";
import {
  BRND_SEASON_2_CONFIG,
  BRND_SEASON_2_CONFIG_ABI,
} from "@/config/contracts";

// Components
import Typography from "@/components/Typography";

// Hooks
import { useStoriesInMotion } from "@/shared/hooks/contract/useStoriesInMotion";
import { useAuth } from "@/shared/hooks/auth";

// Types
import { VotingViewProps, VotingViewEnum } from "../../types";

// Assets
// StyleSheet
import styles from "./ShareView.module.scss";
import {
  composeMiniAppCast,
  getMiniAppClientFid,
} from "@/shared/utils/farcasterActions";
import { triggerNotificationHaptic } from "@/shared/utils/haptics";
import { logFeatureError } from "@/shared/utils/logger";
import {
  isAbortLikeError,
  isSupersededOperationError,
} from "@/shared/hooks/contract/useStoriesInMotion.public";
import {
  buildShareCastText,
  getClaimAmountLabel,
  getShareActionState,
  getShareErrorMessage,
  getShareFeedbackState,
  getShareRecoveryState,
  shouldRenderShareLoadingState,
} from "./viewModel";
import { ShareStatusPanel } from "./ShareStatusPanel";
import { ShareHeaderSection } from "./ShareHeaderSection";
import { SharePodiumSection } from "./SharePodiumSection";
import { ShareActionsSection } from "./ShareActionsSection";

interface ShareViewProps extends VotingViewProps {}
type CastComposeResponse = {
  cast?: {
    hash?: string;
  };
};

export default function ShareView({
  currentBrands,
  currentVoteId: _currentVoteId,
  navigateToView,
  transactionHash,
}: ShareViewProps) {
  const [
    manualVerificationMessageDisplay,
    setManualVerificationMessageDisplay,
  ] = useState(false);
  const navigate = useNavigate();
  const { data: authData, updateAuthData } = useAuth();

  const { address: connectedWallet } = useAccount();
  const userFid = authData?.fid ? BigInt(authData.fid) : undefined;

  const { data: authorizedWallets } = useReadContract({
    address: BRND_SEASON_2_CONFIG.CONTRACT,
    abi: BRND_SEASON_2_CONFIG_ABI,
    functionName: "getUserWallets",
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
    verifyShareAndGetClaimSignature,
    executeClaimReward,
    isPending: isClaimPending,
    isConfirming: isClaimConfirming,
    error: claimError,
  } = useStoriesInMotion(
    undefined, // onAuthorizeSuccess
    undefined, // onLevelUpSuccess
    undefined, // onVoteSuccess
    // onClaimSuccess
    async (txData) => {
      triggerNotificationHaptic("success");

      const claimTxHash = txData?.txHash;
      if (!claimTxHash) {
        return;
      }

      // Get castHash from claimData or authData
      const castHash =
        claimData?.castHash || authData?.todaysVoteStatus?.castHash;

      // Calculate today's day number
      const now = Math.floor(Date.now() / 1000);
      const day = Math.floor(now / 86400);

      // Get reward amount from claimData
      const rewardAmount = claimData?.claimSignature?.amount;

      // Optimistically update auth context immediately with claim transaction
      updateAuthData({
        todaysVoteStatus: {
          hasVoted: true,
          hasShared: true,
          hasClaimed: true,
          voteId: transactionHash || authData?.todaysVoteStatus?.voteId || null, // Use transaction hash as vote ID
          castHash: castHash || authData?.todaysVoteStatus?.castHash || null,
          transactionHash:
            transactionHash ||
            authData?.todaysVoteStatus?.transactionHash ||
            null,
          day: day,
        },
        contextualTransaction: {
          transactionHash: claimTxHash,
          transactionType: "claim",
          rewardAmount: rewardAmount,
          castHash:
            castHash || authData?.todaysVoteStatus?.castHash || undefined,
          day: day,
        },
      });

      // Navigate to congrats view after successful claim
      navigateToView?.(
        VotingViewEnum.CONGRATS,
        currentBrands,
        transactionHash || "", // Use transaction hash as vote ID
        transactionHash,
        castHash || undefined
      );
    }
  );

  const [isSharing, setIsSharing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [hasSharedManually, setHasSharedManually] = useState(false);
  const [isFarcasterClient, setIsFarcasterClient] = useState<boolean | null>(
    null
  );
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
  const shareOperationRef = useRef(0);

  const startShareOperation = useCallback(() => {
    shareOperationRef.current += 1;
    return shareOperationRef.current;
  }, []);

  const isShareOperationActive = useCallback((operationId: number) => {
    return shareOperationRef.current === operationId;
  }, []);

  const resetShareLoadingIfActive = useCallback(
    (operationId: number) => {
      if (!isShareOperationActive(operationId)) {
        return false;
      }
      setIsSharing(false);
      setIsVerifying(false);
      setIsClaiming(false);
      return true;
    },
    [isShareOperationActive]
  );

  const applyShareErrorIfActive = useCallback(
    (
      operationId: number,
      message: string,
      options?: {
        resetManualFlags?: boolean;
        clearClaimData?: boolean;
      }
    ) => {
      if (!resetShareLoadingIfActive(operationId)) {
        return false;
      }
      setShareError(message);
      if (options?.resetManualFlags) {
        setManualVerificationMessageDisplay(false);
        setHasSharedManually(false);
      }
      if (options?.clearClaimData) {
        setClaimData(null);
      }
      return true;
    },
    [resetShareLoadingIfActive]
  );

  /**
   * Detect if we're in a Farcaster client on component mount
   */
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const clientFid = await getMiniAppClientFid();
        // Farcaster clientFid = 9152, TBA clientFid = 309857
        const isFarcaster = clientFid === 9152;
        setIsFarcasterClient(isFarcaster);
      } catch (error) {
        // If SDK fails, assume non-Farcaster
        setIsFarcasterClient(false);
      }
    };

    detectPlatform();
  }, []);

  /**
   * Handles the click event for the "Skip" button.
   */
  const handleClickSkip = useCallback(() => {
    navigate("/");
  }, [navigate]);

  /**
   * Handles manual share confirmation for non-Farcaster clients
   */
  const handleManualShareConfirmation = useCallback(async () => {
    if (isVerifying) return;
    const operationId = startShareOperation();

    setIsVerifying(true);
    setShareError(null);

    try {
      // Use transaction hash as the vote ID since backend now uses txHash as primary key
      const voteIdForVerification = transactionHash;

      // Get the actual clientFid for the platform
      const clientFid = await getMiniAppClientFid();

      // For non-Farcaster (TBA = 309857), we pass empty castHash
      // Backend will search for shares containing the vote hash
      const verificationResult = await verifyShareAndGetClaimSignature(
        "", // Empty castHash for manual verification
        voteIdForVerification || "", // Use transaction hash as vote ID
        transactionHash || "",
        rewardRecipient,
        clientFid // Pass actual clientFid (309857 for TBA, etc.)
      );

      // Store claim data for the claim button
      if (!isShareOperationActive(operationId)) {
        return;
      }

      setClaimData({
        castHash: verificationResult.castHash, // No specific cast hash for manual shares
        claimSignature: verificationResult.claimSignature,
        day: verificationResult.day,
        recipientAddress: rewardRecipient || connectedWallet!,
      });

      // Calculate today's day number
      const now = Math.floor(Date.now() / 1000);
      const day = Math.floor(now / 86400);

      // Optimistically update auth context immediately
      updateAuthData({
        todaysVoteStatus: {
          hasVoted: true,
          hasShared: true,
          hasClaimed: false,
          voteId: transactionHash || null,
          castHash: verificationResult.castHash, // No specific cast hash for manual shares
          transactionHash: transactionHash || "",
          day: day,
        },
        contextualTransaction: {
          transactionHash: null,
          transactionType: null,
          castHash: "",
          day: day,
        },
      });

      if (isShareOperationActive(operationId)) {
        setIsVerifying(false);
      }
    } catch (error: unknown) {
      if (isAbortLikeError(error) || isSupersededOperationError(error)) {
        resetShareLoadingIfActive(operationId);
        return;
      }
      const errorMessage = getShareErrorMessage(
        error,
        "Share not found. Please make sure you shared and try again."
      );
      logFeatureError({
        feature: "share_view",
        action: "manual_verify_share",
        error,
      });
      applyShareErrorIfActive(operationId, errorMessage, {
        resetManualFlags: true,
      });
    }
  }, [
    transactionHash,
    verifyShareAndGetClaimSignature,
    isVerifying,
    rewardRecipient,
    connectedWallet,
    updateAuthData,
    startShareOperation,
    isShareOperationActive,
    resetShareLoadingIfActive,
    applyShareErrorIfActive,
  ]);

  /**
   * Handles the unified sharing logic with verification.
   */
  const handleClickShare = useCallback(async () => {
    if (isSharing || isVerifying) return; // Prevent double-clicks
    const operationId = startShareOperation();

    // Farcaster flow continues as before
    setIsSharing(true);
    setShareError(null);

    try {
      const castText = buildShareCastText(currentBrands);

      // Build Farcaster embed URL from env, stripping trailing slash
      const embedBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const voteHash = transactionHash;
        if (!voteHash) {
        if (resetShareLoadingIfActive(operationId)) {
          setShareError("Vote hash unavailable. Please retry from Vote.");
        }
        return;
      }
      const embedUrl = `${embedBase}/embeds/podium/${voteHash}`;
      // Compose cast with standardized text and embed

      // Add timeout to prevent infinite hanging, but only for non-Farcaster clients
      const castPromise = composeMiniAppCast({
        text: castText,
        embeds: [embedUrl],
      });

      let castResponse;
      if (isFarcasterClient === true) {
        // For Farcaster, don't use timeout - wait for proper response
        try {
          castResponse = await castPromise;
        } catch (error) {
          castResponse = null;
        }
      } else {
        // For TBA/other clients, use timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("composeCast timeout")), 5000)
        );

        try {
          castResponse = await Promise.race([castPromise, timeoutPromise]);
        } catch (error) {
          castResponse = null; // This will trigger the TBA flow
        }
      }

      const castHashFromResponse = (castResponse as CastComposeResponse | null)
        ?.cast?.hash;

      // If cast was successful and we have a hash, verify share immediately for Farcaster
      if (castHashFromResponse) {
        // For Farcaster, immediately start verification (no intermediate button)
        if (isShareOperationActive(operationId)) {
          setIsSharing(false);
          setIsVerifying(true);
        }

        const castHash = castHashFromResponse;
        // Verify share and get claim signature (does not execute transaction)
        try {
          // Use transaction hash as the vote ID since backend now uses txHash as primary key
          const voteIdForVerification = transactionHash;
          const contextFid = await getMiniAppClientFid();

          const verificationResult = await verifyShareAndGetClaimSignature(
            castHash,
            voteIdForVerification,
            transactionHash,
            rewardRecipient, // Pass the authorized wallet as recipient
            contextFid
          );

          // Store claim data for the claim button
          if (!isShareOperationActive(operationId)) {
            return;
          }

          setClaimData({
            castHash,
            claimSignature: verificationResult.claimSignature,
            day: verificationResult.day,
            recipientAddress: rewardRecipient || connectedWallet!,
          });

          // Calculate today's day number
          const now = Math.floor(Date.now() / 1000);
          const day = Math.floor(now / 86400);

          // Optimistically update auth context immediately with cast hash
          // This ensures UI updates instantly without waiting for backend
          updateAuthData({
            todaysVoteStatus: {
              hasVoted: true,
              hasShared: true,
              hasClaimed: false,
              voteId: transactionHash || null, // Use transaction hash as vote ID
              castHash: castHash,
              transactionHash:
                transactionHash ||
                authData?.todaysVoteStatus?.transactionHash ||
                null,
              day: day,
            },
            contextualTransaction: {
              transactionHash: null, // No transaction yet - user needs to claim
              transactionType: null, // Will be 'claim' after claim transaction
              castHash: castHash, // Add castHash to contextualTransaction
              day: day,
            },
          });

          if (isShareOperationActive(operationId)) {
            setIsVerifying(false);
          }

          // Note: castHash is now available and will be passed through viewProps
          // via todaysVoteStatus.castHash after the auth query refreshes
        } catch (error: unknown) {
          if (isAbortLikeError(error) || isSupersededOperationError(error)) {
            resetShareLoadingIfActive(operationId);
            return;
          }
          const errorMessage = getShareErrorMessage(
            error,
            "Failed to verify share. Please try again."
          );
          logFeatureError({
            feature: "share_view",
            action: "verify_share",
            error,
          });
          applyShareErrorIfActive(operationId, errorMessage);
        }
      } else {
        // THIS MEANS THAT THE CAST WAS SHARED VIA OTHER CLIENTS (NOT FARCASTER)
        // WE NEED TO VERIFY THE SHARE MANUALLY
        await new Promise((resolve) => setTimeout(resolve, 1111));
        if (isShareOperationActive(operationId)) {
          setIsSharing(false);
          setHasSharedManually(true);
        }
      }
    } catch (error) {
      logFeatureError({
        feature: "share_view",
        action: "compose_share",
        error,
      });
      applyShareErrorIfActive(operationId, "Failed to share cast. Please try again.");
    }
  }, [
    currentBrands,
    transactionHash,
    verifyShareAndGetClaimSignature,
    isSharing,
    isVerifying,
    rewardRecipient,
    connectedWallet,
    updateAuthData,
    authData,
    isFarcasterClient,
    startShareOperation,
    isShareOperationActive,
    resetShareLoadingIfActive,
    applyShareErrorIfActive,
  ]);

  /**
   * Handles the claim reward button click - executes the transaction
   */
  const handleClickClaim = useCallback(async () => {
    if (!claimData || isClaiming || isClaimPending || isClaimConfirming) {
      return;
    }
    const operationId = startShareOperation();

    setIsClaiming(true);
    setShareError(null);

    try {
      await executeClaimReward(
        claimData.castHash,
        claimData.claimSignature,
        claimData.day,
        claimData.recipientAddress // Pass stored recipient
      );

      // Note: Navigation to CongratsView happens in onClaimSuccess callback
    } catch (error: unknown) {
      if (isAbortLikeError(error) || isSupersededOperationError(error)) {
        resetShareLoadingIfActive(operationId);
        return;
      }
      const errorMessage = getShareErrorMessage(
        error,
        "Failed to claim reward. Please try again."
      );
      logFeatureError({
        feature: "share_view",
        action: "claim_reward",
        error,
      });
      applyShareErrorIfActive(operationId, errorMessage, {
        clearClaimData: true,
      });
    }
  }, [
    claimData,
    executeClaimReward,
    isClaiming,
    isClaimPending,
    isClaimConfirming,
    startShareOperation,
    resetShareLoadingIfActive,
    applyShareErrorIfActive,
  ]);

  // Note: currentVoteId might be empty during optimistic update, but we can still show the UI
  if (shouldRenderShareLoadingState(currentBrands)) {
    return (
      <div className={styles.body}>
        <div className={styles.container}>
          <Typography>Loading vote data...</Typography>
        </div>
      </div>
    );
  }

  const claimAmountLabel = getClaimAmountLabel(claimData?.claimSignature.amount);
  const shareActionVm = getShareActionState({
    isSharing,
    isVerifying,
    isClaiming,
    isClaimPending,
    isClaimConfirming,
    hasClaimData: claimData !== null,
    hasSharedManually,
    isFarcasterClient,
    claimAmountWei: claimData?.claimSignature.amount,
  });
  const shareUiState = shareActionVm.uiState;
  const shareFeedbackState = getShareFeedbackState({
    isFarcasterClient,
    hasSharedManually,
    isVerifying,
    manualVerificationMessageDisplay,
    claimAmountLabel,
    hasClaimData: Boolean(claimData),
    isClaiming,
    isClaimPending,
    isClaimConfirming,
    claimError,
    shareError,
  });
  const shareRecoveryState = getShareRecoveryState({
    manualVerificationMessageDisplay,
    claimData,
    isWalletMismatch: Boolean(isWalletMismatch),
  });
  const primaryActionHandler =
    shareUiState.primaryAction === "claim"
      ? handleClickClaim
      : shareUiState.primaryAction === "manual-verify"
      ? handleManualShareConfirmation
      : handleClickShare;

  return (
    <div className={styles.body}>
      <ShareHeaderSection />

      <ShareStatusPanel {...shareFeedbackState} />

      <SharePodiumSection
        currentBrands={currentBrands}
        buttonCaption={shareActionVm.buttonCaption}
        isLoading={shareUiState.isLoading}
        showShareIcon={shareUiState.showShareIcon}
        disablePrimaryButton={shareUiState.disablePrimaryButton}
        showManualVerifyButton={shareRecoveryState.showManualVerifyButton}
        isVerifying={isVerifying}
        showWalletWarning={shareRecoveryState.showWalletWarning}
        rewardRecipient={rewardRecipient}
        onPrimaryAction={primaryActionHandler}
        onManualVerify={handleManualShareConfirmation}
      />
      <ShareActionsSection
        isLoading={shareUiState.isLoading}
        onSkip={handleClickSkip}
      />
    </div>
  );
}
