// Dependencies
import { useCallback, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import { useConnect } from "wagmi";

// Hooks
import { Brand } from "@/hooks/brands";
import { useAuth } from "@/shared/hooks/auth";
import { useStoriesInMotion } from "@/shared/hooks/contract/useStoriesInMotion";

import QuestionMarkIcon from "@/shared/assets/icons/question-mark.svg?react";

// Components
import Podium from "@/components/Podium";
import Typography from "@/components/Typography";
import IconButton from "@/components/IconButton";

// Types
import { VotingViewProps } from "../../types";

// StyleSheet
import styles from "./PodiumView.module.scss";

// Assets
import Logo from "@/assets/images/logo.svg";
import GoBackIcon from "@/assets/icons/go-back-icon.svg?react";

// Hooks
import { ModalsIds, useModal } from "@/hooks/ui";
import sdk from "@farcaster/miniapp-sdk";
import Button from "@/shared/components/Button";

interface PodiumViewProps extends VotingViewProps {}

export default function PodiumView({}: PodiumViewProps) {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { data: authData, updateAuthData } = useAuth();

  const { connect, connectors, error: connectError } = useConnect();

  const [isVotingOnChain, setIsVotingOnChain] = useState(false);
  const [voteCompleted, setVoteCompleted] = useState(false);
  const [_voteCost, setVoteCost] = useState<string>("0");
  const [, setVotedBrands] = useState<Brand[] | null>(null);
  // Use ref to access current votedBrands in async callback
  const votedBrandsRef = useRef<Brand[] | null>(null);

  const {
    userInfo,
    brndBalance,
    isConnected,
    hasVotedToday: hasVotedOnChain,
    vote: voteOnChain,
    getVoteCost,
    isPending,
    isConfirming,
    isApproving,
    isVoting,
    error: contractError,
    isLoadingBrndBalance,
  } = useStoriesInMotion(
    undefined, // onLevelUpSuccess
    // onVoteSuccess - after successful vote transaction
    async (txData) => {
      console.log("we are probably inside the onvote success callback", txData);
      sdk.haptics.notificationOccurred("success");

      const txHash = txData?.txHash;

      if (!txHash) {
        setIsVotingOnChain(false);
        setVotedBrands(null);
        votedBrandsRef.current = null;
        return;
      }

      // Get the brands from ref (to avoid closure issues)
      // Podium component passes: [left(2nd), middle(1st), right(3rd)]
      // Backend expects: [1st, 2nd, 3rd]
      const podiumBrands = votedBrandsRef.current;

      // Reorder to backend format: [1st, 2nd, 3rd]
      const brandsInBackendFormat =
        podiumBrands && podiumBrands.length >= 3
          ? [podiumBrands[1], podiumBrands[0], podiumBrands[2]] // [middle(1st), left(2nd), right(3rd)]
          : null;

      // Calculate today's day number
      const now = Math.floor(Date.now() / 1000);
      const day = Math.floor(now / 86400);

      // Optimistically update auth context immediately with vote transaction AND brands
      // This ensures UI updates instantly without waiting for backend
      // Include brands so VotePage doesn't need to fetch them
      updateAuthData({
        ...authData,
        hasVotedToday: true,
        todaysVote:
          brandsInBackendFormat && brandsInBackendFormat.length >= 3
            ? {
                id: authData?.todaysVote?.id || "", // Will be updated by backend later
                date: new Date().toISOString(),
                brand1: brandsInBackendFormat[0], // 1st place
                brand2: brandsInBackendFormat[1], // 2nd place
                brand3: brandsInBackendFormat[2], // 3rd place
              }
            : authData?.todaysVote || null,
        todaysVoteStatus: {
          hasVoted: true,
          hasShared: false,
          hasClaimed: false,
          voteId: txHash, // Use transaction hash as vote ID
          castHash: null,
          transactionHash: txHash,
          day: day,
        },
        contextualTransaction: {
          transactionHash: txHash,
          transactionType: "vote",
          day: day,
        },
      });

      // IMMEDIATELY clear all voting states to prevent stuck UI
      setIsVotingOnChain(false);
      setVoteCompleted(true); // Mark vote as completed

      // Force immediate re-render and state transition
      const currentUnix = Math.floor(Date.now() / 1000);

      // Use requestAnimationFrame to ensure state updates are processed
      requestAnimationFrame(() => {
        setIsVotingOnChain(false);
        setVoteCompleted(true);
        navigate(`/vote/${currentUnix}`, { replace: true });
      });
    }
  );

  // Calculate vote cost when user info changes
  useEffect(() => {
    if (userInfo?.brndPowerLevel) {
      const cost = getVoteCost(userInfo.brndPowerLevel);
      setVoteCost(parseFloat(formatUnits(cost, 18)).toFixed(2));
    }
  }, [userInfo, getVoteCost]);

  // Monitor auth data changes to update local state
  useEffect(() => {
    if (authData?.todaysVoteStatus?.hasVoted && isVotingOnChain) {
      setIsVotingOnChain(false);
      setVoteCompleted(true);
    }
  }, [authData?.todaysVoteStatus?.hasVoted, isVotingOnChain]);

  // No need to check claim status - we use todaysVoteStatus from /me endpoint

  /**
   * Validates the selected brands before submitting vote.
   *
   * @param {Brand[]} brands - Array of selected brands
   * @returns {boolean} Whether the brands are valid for voting
   */
  const validateBrands = useCallback(
    (brands: Brand[]): boolean => {
      // Check if we have exactly 3 brands
      if (brands.length !== 3) {
        openModal(ModalsIds.BOTTOM_ALERT, {
          title: "Invalid Selection",
          content: (
            <Typography>
              Please select exactly 3 brands for your podium.
            </Typography>
          ),
        });
        return false;
      }

      // Check if all brands are different
      const brandIds = brands.map((brand) => brand.id);
      const uniqueIds = new Set(brandIds);
      if (uniqueIds.size !== 3) {
        openModal(ModalsIds.BOTTOM_ALERT, {
          title: "Duplicate Selection",
          content: (
            <Typography>
              Please select 3 different brands for your podium.
            </Typography>
          ),
        });
        return false;
      }

      // Check if user has already voted today (backend check)
      if (authData?.hasVotedToday) {
        openModal(ModalsIds.BOTTOM_ALERT, {
          title: "Already Voted",
          content: (
            <Typography>
              You have already voted today. Come back tomorrow to vote again!
            </Typography>
          ),
        });
        return false;
      }

      // Check if user has already voted on-chain today
      if (hasVotedOnChain) {
        openModal(ModalsIds.BOTTOM_ALERT, {
          title: "Already Voted On-Chain",
          content: (
            <Typography>
              You have already voted on-chain today. Come back tomorrow to vote
              again!
            </Typography>
          ),
        });
        return false;
      }

      return true;
    },
    [openModal, authData, hasVotedOnChain]
  );

  /**
   * Determines the voting strategy and user's voting eligibility
   * Updated for V4 contract: ALL users must pay BRND to vote (minimum 100 BRND)
   */
  const determineVotingStrategy = useCallback(() => {
    const powerLevel = userInfo?.brndPowerLevel || 0;
    const balance = parseFloat(brndBalance || "0");
    const requiredAmount = parseFloat(formatUnits(getVoteCost(powerLevel), 18));

    if (!isConnected) {
      return {
        strategy: "connect-wallet",
        canVote: false,
        reason: "Connect your wallet to start voting",
        requiredAmount,
        currentBalance: balance,
      };
    }

    if (balance < requiredAmount) {
      return {
        strategy: "insufficient-brnd",
        canVote: false,
        reason: `You need ${requiredAmount.toFixed(
          0
        )} BRND to vote. Buy BRND tokens to participate.`,
        requiredAmount,
        currentBalance: balance,
      };
    }

    return {
      strategy: "on-chain",
      canVote: true,
      reason: `Ready to vote with ${requiredAmount.toFixed(0)} BRND`,
      requiredAmount,
      currentBalance: balance,
    };
  }, [userInfo?.brndPowerLevel, brndBalance, isConnected, getVoteCost]);

  /**
   * Handles wallet connection using wagmi's useConnect with Farcaster Mini App connector
   */
  const handleWalletConnection = useCallback(async () => {
    try {
      // Check if wallet is already connected
      if (isConnected) {
        return true;
      }

      // Use wagmi's useConnect with Farcaster Mini App connector
      if (!connectors || connectors.length === 0) {
        throw new Error("No wallet connectors available");
      }

      // Connect using the first connector (Farcaster Mini App connector)
      connect({ connector: connectors[0] });

      // Note: The connection is async, but wagmi will handle the state updates
      // The isConnected state will update automatically when connection succeeds
      // If there's an error, it will be available in connectError
      return true;
    } catch (error: any) {
      console.error("Wallet connection failed:", error);

      // Show user-friendly error message
      openModal(ModalsIds.BOTTOM_ALERT, {
        title: "Wallet Connection Failed",
        content: (
          <div>
            <Typography>
              Unable to connect your wallet. Please try again.
            </Typography>
            <br />
            <Typography size={12}>
              {error.message || "Unknown error occurred"}
            </Typography>
          </div>
        ),
      });

      return false;
    }
  }, [isConnected, connect, connectors, openModal]);

  // Handle connection errors from useConnect
  useEffect(() => {
    if (connectError) {
      console.error("Wallet connection error:", connectError);
      openModal(ModalsIds.BOTTOM_ALERT, {
        title: "Wallet Connection Failed",
        content: (
          <div>
            <Typography>
              Unable to connect your wallet. Please try again.
            </Typography>
            <br />
            <Typography size={12}>
              {connectError.message || "Unknown error occurred"}
            </Typography>
          </div>
        ),
      });
    }
  }, [connectError, openModal]);

  /**
   * Handles the submission of votes for the selected brands.
   * Updated for V4 contract with improved authorization and approval flow.
   */
  const handleSubmitVote = useCallback(
    async (brands: Brand[]) => {
      // Validate brands before submission
      if (!validateBrands(brands)) {
        return;
      }

      // Add haptic feedback
      sdk.haptics.selectionChanged();

      try {
        const votingStatus = determineVotingStrategy();
        // Podium component passes: [left(2nd), middle(1st), right(3rd)]
        // Backend expects: [1st, 2nd, 3rd]
        const brandIds: [number, number, number] = [
          brands[1].id, // 1st place (middle slot in UI)
          brands[0].id, // 2nd place (left slot in UI)
          brands[2].id, // 3rd place (right slot in UI)
        ];

        // In V4 contract: ALL voting requires BRND payment - no backend-only voting
        if (votingStatus.strategy !== "on-chain") {
          // This should not happen as validation should catch it, but handle gracefully
          throw new Error(votingStatus.reason);
        }

        // All users must vote on-chain with BRND payment
        setIsVotingOnChain(true);
        setVoteCompleted(false); // Reset completion state

        // Store brands for navigation after successful vote (both state and ref)
        setVotedBrands(brands);
        votedBrandsRef.current = brands;

        // Ensure wallet is connected
        const walletConnected = await handleWalletConnection();
        if (!walletConnected) {
          setIsVotingOnChain(false);
          setVotedBrands(null);
          votedBrandsRef.current = null;
          return;
        }

        // Submit on-chain vote - V4 contract handles authorization inline
        await voteOnChain(brandIds);

        // Success handling is now done in the onVoteSuccess callback
      } catch (error: any) {
        console.error("❌ [PodiumView] Voting error:", error);

        // Always clear voting state on error to prevent stuck spinners
        setIsVotingOnChain(false);
        setVoteCompleted(false);
        setVotedBrands(null);
        votedBrandsRef.current = null;

        // Show appropriate error feedback
        sdk.haptics.notificationOccurred("error");

        openModal(ModalsIds.BOTTOM_ALERT, {
          title: "Vote Failed",
          content: (
            <div>
              <Typography>
                Failed to submit your vote. Please try again.
              </Typography>
              {error.message && (
                <>
                  <br />
                  <Typography size={12}>Error: {error.message}</Typography>
                </>
              )}
              <br />
              <Typography size={12}>
                💡 Make sure you have enough BRND tokens and try again.
              </Typography>
            </div>
          ),
        });
      }
    },
    [
      validateBrands,
      determineVotingStrategy,
      handleWalletConnection,
      voteOnChain,
      openModal,
    ]
  );

  /**
   * Gets the appropriate action button based on voting status
   */
  const getNextAction = useCallback(() => {
    const votingStatus = determineVotingStrategy();

    if (votingStatus.strategy === "connect-wallet") {
      return {
        label: "🔗 Connect Wallet",
        description: "Connect your wallet to start voting",
        action: () => {
          sdk.haptics.selectionChanged();
          handleWalletConnection();
        },
        variant: "primary" as const,
      };
    }

    if (votingStatus.strategy === "insufficient-brnd") {
      return {
        label: "💰 Get $BRND",
        description: `You Need ${votingStatus.requiredAmount.toFixed(
          0
        )} tokens to vote onchain.`,
        action: () => {
          sdk.haptics.selectionChanged();
          sdk.actions.swapToken({
            sellToken:
              "eip155:8453/erc20:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            buyToken:
              "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07",
            sellAmount: votingStatus.requiredAmount.toString(),
          });
        },
        variant: "primary" as const,
      };
    }

    // Default action for users who can vote
    return {
      label: "🗳️ Vote Now",
      description: "Ready to vote",
      action: () => {
        // Action is handled by handleSubmitVote
        sdk.haptics.notificationOccurred("success");
      },
      variant: "primary" as const,
    };
  }, [determineVotingStrategy, handleWalletConnection, navigate]);

  /**
   * Handles the button click from the Podium component.
   * Only handles voting actions - sharing and claiming are handled by their respective components.
   */
  const handlePodiumButtonClick = useCallback(
    (brands: Brand[]) => {
      const votingStatus = determineVotingStrategy();

      // If user needs to connect wallet or get BRND, handle that first
      if (
        votingStatus.strategy === "connect-wallet" ||
        votingStatus.strategy === "insufficient-brnd"
      ) {
        const nextAction = getNextAction();
        nextAction.action();
        return;
      }

      // Otherwise, submit the vote
      handleSubmitVote(brands);
    },
    [determineVotingStrategy, getNextAction, handleSubmitVote]
  );

  /**
   * Handles the click event for the "How to Score" button.
   */
  const handleClickHowToScore = useCallback(() => {
    sdk.haptics.selectionChanged();

    openModal(ModalsIds.BOTTOM_ALERT, {
      title: "BRND Voting Rules & Rewards",
      content: (
        <div className={styles.list}>
          <Typography size={13} lineHeight={16} weight="medium">
            📊 SCORING SYSTEM
          </Typography>
          <Typography size={12} lineHeight={14}>
            🥇 1st: 60% • 🥈 2nd: 30% • 🥉 3rd: 10%
          </Typography>
          <Typography size={11} lineHeight={13}>
            Brands receive BRND tokens based on podium position
          </Typography>

          <Typography size={13} lineHeight={16} weight="medium">
            💸 VOTE COST
          </Typography>
          <Typography size={11} lineHeight={13}>
            • Base cost: 100 $BRND (Level 0)
          </Typography>
          <Typography size={11} lineHeight={13}>
            • Scales with BRND Power Level
          </Typography>
          <Typography size={11} lineHeight={13}>
            • Level 1: 150 $BRND • Level 2: 200 $BRND • Level 3: 300 $BRND •
            Level 4: 400 $BRND • Level 5: 500 $BRND • Level 6: 600 $BRND • Level
            7: 700 $BRND • Level 8: 800 $BRND (max)
          </Typography>

          <Typography size={13} lineHeight={16} weight="medium">
            💰 REWARDS
          </Typography>
          <Typography size={11} lineHeight={13}>
            • If you share your podium on farcaster, you can claim 10x of that
            $BRND back as rewards.
          </Typography>
          <Typography size={11} lineHeight={13}>
            • Example: 100 $BRND vote → 1,000 $BRND reward (900 $BRND profit)
          </Typography>

          <Typography size={13} lineHeight={16} weight="medium">
            ⏰ VOTING SCHEDULE
          </Typography>
          <Typography size={11} lineHeight={13}>
            • Once per day • Resets at midnight UTC
          </Typography>
          <Typography size={11} lineHeight={13}>
            • All votes recorded on Base blockchain, the contract is here{" "}
            <span
              onClick={() => {
                sdk.actions.openUrl({ url: "" });
              }}
            >
              PASTE LAST URL HERE
            </span>
          </Typography>
          <Typography size={11} lineHeight={13}>
            • Leaderboard updates in real-time, points earned also depend on
            your $BRND power level.
          </Typography>
        </div>
      ),
    });
  }, [openModal]);

  return (
    <div className={styles.body}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <IconButton
          variant={"solid"}
          icon={<GoBackIcon />}
          onClick={() => navigate("/")}
          className={styles.backBtn}
        />
        <div className={styles.center}>
          <img src={Logo} className={styles.logo} alt="Logo" />
          <Typography
            size={18}
            lineHeight={24}
            variant={"druk"}
            weight={"text-wide"}
          >
            {authData?.todaysVoteStatus?.hasClaimed
              ? "Rewards Claimed!"
              : authData?.todaysVoteStatus?.hasShared
              ? "Already voted and shared!"
              : authData?.todaysVoteStatus?.hasVoted || hasVotedOnChain
              ? "Already voted today!"
              : "Add your top brands on this podium"}
          </Typography>

          <span onClick={handleClickHowToScore}>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              lineHeight={16}
              className={styles.howToScoreBtn}
            >
              How Onchain Voting & Rewards Work{" "}
              <span className={styles.questionMarkIcon}>
                <QuestionMarkIcon />
              </span>
            </Typography>
          </span>
          {isConnected ? (
            <Typography size={12} lineHeight={16} textAlign="center">
              Your $BRND balance:{" "}
              {isLoadingBrndBalance
                ? "Loading..."
                : brndBalance
                ? parseFloat(brndBalance).toFixed(0)
                : "0"}
            </Typography>
          ) : (
            <Button
              caption="🔗 Connect Wallet"
              onClick={handleWalletConnection}
              variant="primary"
            />
          )}

          {/* Show insufficient balance warning */}
          {(() => {
            const votingStatus = determineVotingStrategy();
            // Only show insufficient balance warning when:
            // 1. Balance data has finished loading (not while loading)
            // 2. User hasn't voted yet
            // 3. Strategy is actually "insufficient-brnd"
            if (
              !isLoadingBrndBalance && // Wait for balance to load
              votingStatus.strategy === "insufficient-brnd" &&
              !hasVotedOnChain
            ) {
              return (
                <div className={styles.insufficientBalanceSection}>
                  <Typography
                    size={14}
                    lineHeight={18}
                    weight="medium"
                    textAlign="center"
                  >
                    ⚠️ Insufficient BRND Balance
                  </Typography>
                  <Typography size={12} lineHeight={16} textAlign="center">
                    You need {votingStatus.requiredAmount.toFixed(0)} $BRND to
                    vote
                  </Typography>
                  <Typography size={11} lineHeight={14} textAlign="center">
                    Current balance: {votingStatus.currentBalance.toFixed(2)}{" "}
                    $BRND
                  </Typography>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </motion.div>
      {/* Show podium only if wallet is connected */}
      {isConnected &&
      (isLoadingBrndBalance ||
        determineVotingStrategy().strategy !== "insufficient-brnd") ? (
        <Podium
          onVote={handlePodiumButtonClick}
          variant={
            authData?.todaysVoteStatus?.hasVoted || hasVotedOnChain
              ? "readonly"
              : "selection"
          }
          initial={
            authData?.todaysVote
              ? [
                  authData.todaysVote.brand2!, // left slot (2nd place)
                  authData.todaysVote.brand1!, // middle slot (1st place)
                  authData.todaysVote.brand3!, // right slot (3rd place)
                ]
              : undefined
          }
          buttonLabel={(() => {
            // PRIORITY 1: If vote is completed locally, show success immediately
            if (
              voteCompleted ||
              authData?.todaysVoteStatus?.hasVoted ||
              hasVotedOnChain
            ) {
              return "✅ Voted Today";
            }

            // Show vote button with status
            const nextAction = getNextAction();
            let buttonLabel = nextAction.label;

            const hasApprovalError =
              contractError &&
              (isApproving ||
                contractError.toLowerCase().includes("approval") ||
                contractError.toLowerCase().includes("approve")) &&
              !isPending &&
              !isConfirming;
            const hasVotingError =
              contractError &&
              (isVoting || contractError.toLowerCase().includes("vote")) &&
              !isPending &&
              !isConfirming;
            const hasGeneralError =
              contractError &&
              !isPending &&
              !isConfirming &&
              !isApproving &&
              !isVoting;

            if (isApproving) {
              if (hasApprovalError) {
                buttonLabel = "❌ Approval Failed - Try Again";
              } else if (isPending) {
                buttonLabel = "⏳ Approve BRND spending...";
              } else if (isConfirming) {
                buttonLabel = "🔄 Approving BRND spending...";
              } else {
                buttonLabel = "✅ Approval Complete - Preparing vote...";
              }
            } else if (isVoting) {
              if (hasVotingError) {
                buttonLabel = "❌ Vote Failed - Try Again";
              } else if (isPending) {
                buttonLabel = "⏳ Confirm in wallet...";
              } else if (isConfirming) {
                buttonLabel = "🔄 Processing vote...";
              } else {
                buttonLabel = "🗳️ Vote Now";
              }
            } else if (hasApprovalError || hasGeneralError) {
              buttonLabel = "❌ Transaction Failed - Try Again";
            } else if (isPending || isConfirming) {
              if (isPending) {
                buttonLabel = "⏳ Confirm transaction in wallet...";
              } else if (isConfirming) {
                buttonLabel = "🔄 Processing transaction...";
              } else {
                buttonLabel = nextAction.label;
              }
            } else if (
              isVotingOnChain &&
              !authData?.todaysVoteStatus?.hasVoted &&
              !voteCompleted
            ) {
              // Only show voting states if we haven't completed the vote yet
              if (isPending) {
                buttonLabel = "⏳ Confirm in wallet...";
              } else if (isConfirming) {
                buttonLabel = "🔄 Processing vote...";
              } else {
                buttonLabel = "🔄 Completing vote...";
              }
            }

            return buttonLabel;
          })()}
          buttonDisabled={(() => {
            // PRIORITY 1: If vote is completed locally, disable button
            if (
              voteCompleted ||
              authData?.todaysVoteStatus?.hasVoted ||
              hasVotedOnChain
            ) {
              return true;
            }

            // Use vote button disabled logic
            let buttonDisabled = false;
            const hasApprovalError =
              contractError &&
              (isApproving ||
                contractError.toLowerCase().includes("approval") ||
                contractError.toLowerCase().includes("approve")) &&
              !isPending &&
              !isConfirming;
            const hasVotingError =
              contractError &&
              (isVoting || contractError.toLowerCase().includes("vote")) &&
              !isPending &&
              !isConfirming;
            const hasGeneralError =
              contractError &&
              !isPending &&
              !isConfirming &&
              !isApproving &&
              !isVoting;

            if (isApproving) {
              buttonDisabled = (isPending || isConfirming) && !hasApprovalError;
            } else if (isVoting) {
              buttonDisabled = (isPending || isConfirming) && !hasVotingError;
            } else if (hasApprovalError || hasGeneralError) {
              buttonDisabled = false;
            } else if (isPending || isConfirming) {
              buttonDisabled = isPending || isConfirming;
            } else if (
              isVotingOnChain &&
              !authData?.todaysVoteStatus?.hasVoted &&
              !voteCompleted
            ) {
              // Only disable if we're voting AND haven't completed yet
              buttonDisabled = true;
            }

            return buttonDisabled;
          })()}
          buttonVariant={(() => {
            const nextAction = getNextAction();
            return nextAction.variant;
          })()}
        />
      ) : (
        isConnected && (
          <Button
            caption="Buy $BRND"
            onClick={() => {
              sdk.actions.swapToken({
                sellToken:
                  "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                buyToken:
                  "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07",
                sellAmount: "1000000",
              });
            }}
          />
        )
      )}
    </div>
  );
}
