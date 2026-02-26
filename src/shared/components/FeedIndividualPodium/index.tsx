import React, { useMemo } from "react";
import classNames from "clsx";
import styles from "./FeedIndividualPodium.module.scss";
import Typography from "@/shared/components/Typography";
import Podium1Icon from "@/shared/assets/icons/podium-1.svg?react";
import Podium2Icon from "@/shared/assets/icons/podium-2.svg?react";
import Podium3Icon from "@/shared/assets/icons/podium-3.svg?react";
import { useModal } from "@/shared/hooks/ui/useModal";
import { ModalsIds } from "@/shared/providers/ModalProvider/types";
import { useAuth } from "@/shared/hooks/auth";
import { useAccount, useConnect } from "wagmi";
import sdk from "@farcaster/miniapp-sdk";

import { IndividualPodiumProps, MintingStep } from "../IndividualPodium";
import { useNavigate } from "react-router-dom";

// Contextual messages for each minting step
const MINTING_STEP_MESSAGES: Record<Exclude<MintingStep, null>, string> = {
  fetching_signature: "Preparing...",
  approving: "Approve $BRND",
  confirming_approval: "Approving...",
  minting: "Confirm mint",
  buying: "Confirm purchase",
  confirming: "Confirming...",
};

// Format large numbers (1000000 -> "1M", 1200000 -> "1.2M")
const formatPrice = (priceStr: string | null): string => {
  if (!priceStr) return "1M";
  // Price comes in wei (18 decimals), convert to BRND
  const priceInBrnd = Number(priceStr) / 1e18;
  if (priceInBrnd >= 1000000) {
    const millions = priceInBrnd / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  } else if (priceInBrnd >= 1000) {
    const thousands = priceInBrnd / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  }
  return priceInBrnd.toFixed(0);
};

// Format time ago display (UTC-based)
const getTimeAgo = (dateStr: string | undefined): string => {
  if (!dateStr) return "";

  const nowUtc = Date.now();

  // Normalize date format
  let normalizedDate = dateStr.replace(" ", "T");
  if (!normalizedDate.endsWith("Z")) {
    normalizedDate += "Z";
  }

  const createdUtc = new Date(normalizedDate).getTime();
  let diffInMs = nowUtc - createdUtc;

  // Handle clock skew
  const CLOCK_SKEW_THRESHOLD = 10 * 60 * 1000;
  if (diffInMs < 0) {
    if (Math.abs(diffInMs) <= CLOCK_SKEW_THRESHOLD) {
      return "Just now";
    }
    diffInMs = 0;
  }

  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;

  const createdDate = new Date(createdUtc);
  return createdDate.toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const FeedIndividualPodium: React.FC<IndividualPodiumProps> = ({
  className,
  podium,
  brand1,
  brand2,
  brand3,
  collectibleData,
  isLastVoteForCombination = false,
  onMintClick,
  onBuyClick,
  onMintSuccess,
  user,
  isPending = false,
  mintingStep = null,
  hasSucceeded = false,
  successType,
}) => {
  const { openModal } = useModal();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const navigate = useNavigate();

  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  // Get contextual message for current minting step
  const getMintingMessage = (): string => {
    if (mintingStep && MINTING_STEP_MESSAGES[mintingStep]) {
      return MINTING_STEP_MESSAGES[mintingStep];
    }
    return "Processing...";
  };

  // Apply optimistic update if transaction succeeded
  const isMinted = hasSucceeded || collectibleData.isCollectible;
  const ownerFid = hasSucceeded ? userFid : collectibleData.ownerFid;
  const owner = hasSucceeded
    ? authData?.username
    : collectibleData.ownerUsername;

  // Price calculations per contract:
  // - Mint price: BASE_PRICE (1M BRND)
  // - Buy price: lastSalePrice * 1.2 (20% increase each sale)
  const lastSalePrice = collectibleData.price || "1000000000000000000000000"; // 1M BRND default
  const buyPrice = String(Math.floor(Number(lastSalePrice) * 1.2));

  const mintPrice = formatPrice(lastSalePrice);
  const displayBuyPrice = formatPrice(buyPrice);

  // Determine states based on contract logic:
  // - canMint: Current user is the podium creator AND was last to vote AND not minted yet
  // - canBuy: IS minted AND user is NOT the current owner
  // - isOwned: IS minted AND user IS the current owner
  // - isNotMintable: NOT minted AND (user was NOT last to vote OR current user is not the creator)
  const isCurrentOwner = isMinted && ownerFid === userFid;
  const isCreator = userFid === user.fid;
  const canMint = isLastVoteForCombination && !isMinted && isCreator;
  const canBuy = isMinted && !isCurrentOwner;
  const isOwned = isCurrentOwner;
  const isNotMintable = !isMinted && (!isLastVoteForCombination || !isCreator);

  // Memoize time ago calculation
  const timeAgo = useMemo(() => getTimeAgo(podium?.date), [podium?.date]);

  const handleArrowClick = () => {
    // collectibleData is already updated optimistically by the parent
    sdk.haptics.selectionChanged();
    openModal(ModalsIds.FEED_PODIUM_DETAIL, {
      podium,
      brand1,
      brand2,
      brand3,
      user,
      collectibleData,
      isLastVoteForCombination: hasSucceeded ? true : isLastVoteForCombination,
      onMintSuccess,
      hasSucceeded,
      successType,
    });
  };

  const handleActionClick = () => {
    if (isPending || isOwned || isNotMintable) return;
    sdk.haptics.selectionChanged();

    // If wallet is not connected, connect it first
    if (!isConnected) {
      const farcasterConnector = connectors?.[0];
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
      return;
    }

    if (canBuy) {
      onBuyClick?.();
    } else if (canMint) {
      onMintClick?.();
    }
  };

  const getButtonText = () => {
    // Show success state first if transaction just succeeded
    if (hasSucceeded) {
      return successType === "buy" ? "Bought!" : "Minted!";
    }
    if (canMint) return `Mint · ${mintPrice} $BRND`;
    if (isOwned) return "Owned";
    if (isNotMintable) return "Not mintable";
    if (canBuy) return `Buy · ${displayBuyPrice} $BRND`;
    return "Not mintable";
  };

  const getButtonStyle = () => {
    // Success state shows as owned/success style
    if (hasSucceeded) return styles.successButton;
    if (canMint) return styles.mintButton;
    if (isOwned) return styles.ownedButton;
    if (isNotMintable) return styles.notMintableButton;
    if (canBuy) return styles.buyButton;
    return styles.mintButton;
  };

  const isButtonDisabled =
    isPending || isOwned || isNotMintable || hasSucceeded;

  const podiumBrands = [
    { brand: brand2, icon: Podium2Icon, place: "second" as const },
    { brand: brand1, icon: Podium1Icon, place: "first" as const },
    { brand: brand3, icon: Podium3Icon, place: "third" as const },
  ];

  return (
    <div className={classNames(styles.container, className)}>
      <div className={styles.cardContent}>
        {/* Date display */}
        {timeAgo && (
          <div className={styles.dateContainer}>
            <Typography
              variant="geist"
              weight="regular"
              size={12}
              className={styles.dateText}
            >
              {timeAgo}
            </Typography>
          </div>
        )}

        {/* Top section: Podium + Creator/Owner info */}
        <div className={styles.topSection}>
          {/* Podium brands */}
          <div className={styles.podiumSection}>
            <div className={styles.podiumContainer}>
              {podiumBrands.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={`podium-${index}`}
                    onClick={() => navigate(`/brand/${item.brand?.id}`)}
                    className={classNames(
                      styles.podiumItem,
                      styles[item.place]
                    )}
                  >
                    {item.brand?.imageUrl ? (
                      <img
                        src={item.brand.imageUrl}
                        alt={item.brand.name}
                        className={styles.brandImage}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder} />
                    )}
                    <div className={styles.numberContainer}>
                      <IconComponent className={styles.numberIcon} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Creator/Owner info */}
          <div className={styles.infoSection}>
            {/* Creator row */}
            <div className={styles.infoRow}>
              <Typography
                variant="geist"
                weight="regular"
                size={12}
                className={styles.infoLabel}
              >
                Creator
              </Typography>
              <div className={styles.userInfo}>
                {user.photoUrl && (
                  <img
                    src={user.photoUrl}
                    alt={user.username}
                    className={styles.userAvatar}
                  />
                )}
                <Typography
                  variant="geist"
                  weight="bold"
                  size={12}
                  className={styles.username}
                >
                  @{user.username}
                </Typography>
              </div>
            </div>

            {/* Owner row */}
            <div className={styles.infoRow}>
              <Typography
                variant="geist"
                weight="regular"
                size={12}
                className={styles.infoLabel}
              >
                Owner
              </Typography>
              <div className={styles.userInfo}>
                {isMinted && owner ? (
                  <>
                    {collectibleData.ownerPhotoUrl ? (
                      <img
                        src={collectibleData.ownerPhotoUrl}
                        alt={owner}
                        className={styles.userAvatar}
                      />
                    ) : (
                      <div className={styles.ownerAvatarPlaceholder} />
                    )}
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={12}
                      className={styles.username}
                    >
                      @{owner}
                    </Typography>
                  </>
                ) : (
                  <div className={styles.noOwner}>
                    <div className={styles.ownerAvatarPlaceholder} />
                    <div className={styles.ownerPlaceholderLine} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Paid/Claimed info - only show if we have data */}
        {podium?.brndPaidWhenCreatingPodium &&
          Number(podium.brndPaidWhenCreatingPodium) > 0 && (
            <div className={styles.paymentInfo}>
              <Typography
                variant="geist"
                weight="bold"
                size={10}
                className={styles.paidAmount}
              >
                Paid {podium.brndPaidWhenCreatingPodium} $BRND
              </Typography>
              {podium?.claimed && (
                <Typography
                  variant="geist"
                  weight="bold"
                  size={10}
                  className={styles.claimedAmount}
                >
                  Claimed {podium.brndPaidWhenCreatingPodium * 10} $BRND
                </Typography>
              )}
            </div>
          )}

        {/* Action button */}
        <button
          className={classNames(
            styles.actionButton,
            getButtonStyle(),
            isButtonDisabled && styles.disabled,
            isPending && styles.loading
          )}
          onClick={handleActionClick}
          disabled={isButtonDisabled}
        >
          {isPending && (
            <svg
              className={styles.spinner}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.25"
              />
              <path
                d="M12 2C6.47715 2 2 6.47715 2 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          )}
          <Typography
            variant="geist"
            weight="bold"
            size={14}
            className={styles.actionButtonText}
          >
            {isPending ? getMintingMessage() : getButtonText()}
          </Typography>
        </button>
      </div>

      {/* Arrow button */}
      <div className={styles.arrowSection}>
        <button className={styles.arrowButton} onClick={handleArrowClick}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6L15 12L9 18"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FeedIndividualPodium;
