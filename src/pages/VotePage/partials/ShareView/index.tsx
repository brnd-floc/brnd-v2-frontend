import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import sdk from "@farcaster/miniapp-sdk";

import { useAccount, useReadContract } from "wagmi";
import {
  BRND_SEASON_2_CONFIG,
  BRND_SEASON_2_CONFIG_ABI,
} from "@/config/contracts";

// Components
import Podium from "@/components/Podium";
import Typography from "@/components/Typography";
import Button from "@/components/Button";
import LoaderIndicator from "@/shared/components/LoaderIndicator";

import Logo from "@/assets/images/logo.svg";

// Hooks
import { useStoriesInMotion } from "@/shared/hooks/contract/useStoriesInMotion";
import { useAuth } from "@/shared/hooks/auth";

// Types
import { VotingViewProps, VotingViewEnum } from "../../types";

// Assets
import ShareIcon from "@/assets/icons/share-icon.svg?react";

// StyleSheet
import styles from "./ShareView.module.scss";

interface ShareViewProps extends VotingViewProps {}

export default function ShareView({
  currentBrands,
  currentVoteId,
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
      sdk.haptics.notificationOccurred("success");

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

  /**
   * Detect if we're in a Farcaster client on component mount
   */
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const context = await sdk.context;
        const clientFid = context.client.clientFid;
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
    if (!currentVoteId || currentVoteId === "") {
      navigate("/");
    } else {
      navigate("/");
    }
  }, [currentVoteId, navigate]);

  /**
   * Handles manual share confirmation for non-Farcaster clients
   */
  const handleManualShareConfirmation = useCallback(async () => {
    if (isVerifying) return;

    setIsVerifying(true);
    setShareError(null);

    try {
      // Use transaction hash as the vote ID since backend now uses txHash as primary key
      const voteIdForVerification = transactionHash;

      // Get the actual clientFid for the platform
      const context = await sdk.context;
      const clientFid = context.client.clientFid;

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

      setIsVerifying(false);
    } catch (error: any) {
      // Always clear all loading states on error
      setIsVerifying(false);
      setIsSharing(false);
      setManualVerificationMessageDisplay(false);
      setShareError(
        error.message ||
          "Share not found. Please make sure you shared and try again."
      );
      // Reset manual share state so user can try again
      setHasSharedManually(false);
    }
  }, [
    currentVoteId,
    transactionHash,
    verifyShareAndGetClaimSignature,
    isVerifying,
    rewardRecipient,
    connectedWallet,
    updateAuthData,
    authData,
  ]);

  /**
   * Handles the unified sharing logic with verification.
   */
  const handleClickShare = useCallback(async () => {
    if (isSharing || isVerifying) return; // Prevent double-clicks

    // Farcaster flow continues as before
    setIsSharing(true);
    setShareError(null);

    try {
      // Safely extract profile/channel info
      // Safely extract profile/channel info
      const getProfileOrChannel = (brand: any) => {
        // Priority: profile first, then channel
        if (brand?.profile) {
          const profile = brand.profile;
          // If profile starts with "@", remove it; otherwise add it
          return profile.startsWith("@") ? profile : `@${profile}`;
        }

        if (brand?.channel) {
          const channel = brand.channel;
          // If channel starts with "/", keep it; otherwise add it
          return channel.startsWith("/") ? channel : `/${channel}`;
        }

        return brand?.name;
      };

      const formattedBrand1 = getProfileOrChannel(currentBrands[1]);
      const formattedBrand2 = getProfileOrChannel(currentBrands[0]);
      const formattedBrand3 = getProfileOrChannel(currentBrands[2]);

      const castText = `I just created my @BRND podium of today:\n\n🥇${
        currentBrands[1]?.name
      } ${formattedBrand1 ? `- ${formattedBrand1}` : ""}\n🥈${
        currentBrands[0]?.name
      } ${formattedBrand2 ? `- ${formattedBrand2}` : ""}\n🥉${
        currentBrands[2]?.name
      } ${formattedBrand3 ? `- ${formattedBrand3}` : ""}`;

      // Build Farcaster embed URL from env, stripping trailing slash
      const embedBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const voteHash = transactionHash;
      if (!voteHash) {
        return;
      }
      const embedUrl = `${embedBase}/embeds/podium/${voteHash}`;
      // Compose cast with standardized text and embed

      // Add timeout to prevent infinite hanging, but only for non-Farcaster clients
      const castPromise = sdk.actions.composeCast({
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

      // If cast was successful and we have a hash, verify share immediately for Farcaster
      if (castResponse && (castResponse as any).cast?.hash) {
        // For Farcaster, immediately start verification (no intermediate button)
        setIsSharing(false);
        setIsVerifying(true);

        const castHash = (castResponse as any).cast?.hash;
        // Verify share and get claim signature (does not execute transaction)
        try {
          // Use transaction hash as the vote ID since backend now uses txHash as primary key
          const voteIdForVerification = transactionHash;
          const contextFid = (await sdk.context).client.clientFid || "";

          const verificationResult = await verifyShareAndGetClaimSignature(
            castHash,
            voteIdForVerification,
            transactionHash,
            rewardRecipient, // Pass the authorized wallet as recipient
            Number(contextFid)
          );

          // Store claim data for the claim button
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

          setIsVerifying(false);

          // Note: castHash is now available and will be passed through viewProps
          // via todaysVoteStatus.castHash after the auth query refreshes
        } catch (error: any) {
          console.error("❌ [ShareView] Share verification failed:", error);
          // Always clear all loading states on error
          setIsSharing(false);
          setIsVerifying(false);
          setShareError(
            error.message || "Failed to verify share. Please try again."
          );
        }
      } else {
        // THIS MEANS THAT THE CAST WAS SHARED VIA OTHER CLIENTS (NOT FARCASTER)
        // WE NEED TO VERIFY THE SHARE MANUALLY
        await new Promise((resolve) => setTimeout(resolve, 1111));
        setIsSharing(false);
        setHasSharedManually(true);
      }
    } catch (error) {
      console.error("📤 [ShareView] Share error:", error);
      // Always clear all loading states on error
      setIsSharing(false);
      setIsVerifying(false);
      setShareError("Failed to share cast. Please try again.");
    }
  }, [
    currentBrands,
    currentVoteId,
    transactionHash,
    verifyShareAndGetClaimSignature,
    isSharing,
    isVerifying,
    rewardRecipient,
    connectedWallet,
    updateAuthData,
    authData,
    isFarcasterClient,
    hasSharedManually,
    handleManualShareConfirmation,
  ]);

  /**
   * Handles the claim reward button click - executes the transaction
   */
  const handleClickClaim = useCallback(async () => {
    if (!claimData || isClaiming || isClaimPending || isClaimConfirming) {
      return;
    }

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
    } catch (error: any) {
      console.error("❌ [ShareView] Claim reward failed:", error);
      // Always clear all loading states on error
      setIsClaiming(false);
      setIsSharing(false);
      setIsVerifying(false);
      setShareError(
        error.message || "Failed to claim reward. Please try again."
      );

      // Reset claim data so user can try again with fresh state
      setClaimData(null);
    }
  }, [
    claimData,
    executeClaimReward,
    isClaiming,
    isClaimPending,
    isClaimConfirming,
  ]);

  // Show loading or error state if data is missing
  // Note: currentVoteId might be empty during optimistic update, but we can still show the UI
  if (!currentBrands || currentBrands.length < 3) {
    return (
      <div className={styles.body}>
        <div className={styles.container}>
          <Typography>Loading vote data...</Typography>
        </div>
      </div>
    );
  }

  // Determine the current state for UI feedback
  const getButtonState = () => {
    if (isSharing) return "Sharing...";
    if (isVerifying) return "Verifying Share";
    if (claimData) {
      // Show claim amount after verification
      const claimAmount = parseFloat(
        formatUnits(BigInt(claimData.claimSignature.amount), 18)
      );
      return `Claim ${claimAmount.toFixed(0)} $BRND`;
    }
    if (isClaiming || isClaimPending || isClaimConfirming) {
      if (isClaimPending) return "⏳ Confirm in wallet...";
      if (isClaimConfirming) return "🔄 Processing...";
      return "Claiming...";
    }

    // Handle non-Farcaster manual sharing flow
    if (hasSharedManually && isFarcasterClient !== true) {
      return "Verify Share";
    }

    return "Share now";
  };

  const isLoading =
    isSharing ||
    isVerifying ||
    isClaiming ||
    isClaimPending ||
    isClaimConfirming;

  // Determine which button to show and what action it should perform
  const showClaimButton = claimData !== null && !isVerifying;

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
          variant={"druk"}
          weight={"wide"}
          className={styles.title}
        >
          You just created your podium!
        </Typography>
      </div>

      {/* Show vote transaction hash - State 2: User has voted, display the transaction */}
      <div className={styles.shareMessage}>
        <Typography
          variant={"geist"}
          weight={"medium"}
          size={12}
          lineHeight={16}
          textAlign={"center"}
        >
          {isFarcasterClient === false && !hasSharedManually
            ? "Share your podium, then click below to verify"
            : "Share your podium to unlock 10x BRND rewards"}
        </Typography>
      </div>
      {/* Show verifying status for manual verification */}
      {isVerifying && manualVerificationMessageDisplay && (
        <div className={styles.verificationMessage}>
          <Typography
            variant={"geist"}
            weight={"medium"}
            size={14}
            lineHeight={18}
            textAlign={"center"}
          >
            🔄 Verifying your share...
          </Typography>
        </div>
      )}
      {/* Show claim ready status */}
      {claimData &&
        !isVerifying &&
        !isClaiming &&
        !isClaimPending &&
        !isClaimConfirming && (
          <div className={styles.verificationMessage}>
            <Typography
              variant={"geist"}
              weight={"medium"}
              size={14}
              lineHeight={18}
              textAlign={"center"}
            >
              ✅ Share verified! Ready to claim{" "}
              {parseFloat(
                formatUnits(BigInt(claimData.claimSignature.amount), 18)
              ).toFixed(0)}{" "}
              $BRND
            </Typography>
          </div>
        )}

      {/* Show claiming status */}
      {(isClaiming || isClaimPending || isClaimConfirming) && (
        <div className={styles.verificationMessage}>
          <Typography
            variant={"geist"}
            weight={"medium"}
            size={14}
            lineHeight={18}
            textAlign={"center"}
          >
            {isClaimPending
              ? "⏳ Confirm reward claim in wallet..."
              : isClaimConfirming
              ? "🔄 Processing reward claim..."
              : "💰 Claiming your reward..."}
          </Typography>
        </div>
      )}

      {/* Show claim error */}
      {(claimError || shareError) && (
        <div className={styles.errorMessage}>
          <Typography
            variant={"geist"}
            weight={"medium"}
            size={14}
            lineHeight={18}
            textAlign={"center"}
          >
            {claimError || shareError}
          </Typography>
        </div>
      )}

      <div className={styles.box}>
        <div className={styles.podium}>
          <Podium
            isAnimated={false}
            variant={"readonly"}
            initial={currentBrands}
          />

          <div className={styles.action}>
            {manualVerificationMessageDisplay ? (
              <Button
                caption={isVerifying ? "Verifying Share" : "Verify share"}
                onClick={handleManualShareConfirmation}
                className={styles.button}
                iconLeft={
                  isVerifying ? <LoaderIndicator size={16} /> : undefined
                }
                disabled={isVerifying}
              />
            ) : (
              <Button
                caption={getButtonState()}
                className={styles.button}
                iconLeft={
                  isLoading ? (
                    <LoaderIndicator size={16} />
                  ) : showClaimButton ? undefined : hasSharedManually &&
                    isFarcasterClient !== true ? undefined : (
                    <ShareIcon />
                  )
                }
                onClick={
                  showClaimButton
                    ? handleClickClaim
                    : hasSharedManually && isFarcasterClient !== true
                    ? handleManualShareConfirmation
                    : handleClickShare
                }
                disabled={isLoading && !showClaimButton}
              />
            )}
          </div>
          {claimData && isWalletMismatch && (
            <div className={styles.walletWarning}>
              <Typography
                variant={"geist"}
                weight={"medium"}
                size={12}
                lineHeight={16}
                textAlign={"center"}
              >
                ⚠️ Rewards will be sent to your registered wallet:{" "}
                {`${rewardRecipient.slice(0, 6)}...${rewardRecipient.slice(
                  -4
                )}`}
              </Typography>
            </div>
          )}
        </div>
      </div>
      <div className={styles.action}>
        <Button
          variant={"underline"}
          caption="Skip"
          onClick={handleClickSkip}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
