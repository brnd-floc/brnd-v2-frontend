import React, { useMemo, useEffect } from 'react';
import classNames from 'clsx';
import sdk from '@farcaster/miniapp-sdk';
import { BaseModalProps, FeedPodiumDetailModalData } from '../../types';
import Typography from '@/shared/components/Typography';
import Podium1Icon from '@/shared/assets/icons/podium-1.svg?react';
import Podium2Icon from '@/shared/assets/icons/podium-2.svg?react';
import Podium3Icon from '@/shared/assets/icons/podium-3.svg?react';
import BRNDPodiumIcon from '@/shared/assets/icons/brnd-podium.svg?react';
import { usePodiumCollectibles } from '@/shared/hooks/contract/usePodiumCollectibles';
import styles from './FeedPodiumDetailModal.module.scss';
import { useAuth } from '@/shared/hooks/auth';

// Format large numbers (1000000 -> "1M", 1200000 -> "1.2M")
const formatPrice = (priceStr: string | null): string => {
  if (!priceStr) return '1M';
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
  if (!dateStr) return '';

  const nowUtc = Date.now();

  // Normalize date format
  let normalizedDate = dateStr.replace(' ', 'T');
  if (!normalizedDate.endsWith('Z')) {
    normalizedDate += 'Z';
  }

  const createdUtc = new Date(normalizedDate).getTime();
  let diffInMs = nowUtc - createdUtc;

  // Handle clock skew
  const CLOCK_SKEW_THRESHOLD = 10 * 60 * 1000;
  if (diffInMs < 0) {
    if (Math.abs(diffInMs) <= CLOCK_SKEW_THRESHOLD) {
      return 'Just now';
    }
    diffInMs = 0;
  }

  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  const createdDate = new Date(createdUtc);
  return createdDate.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const FeedPodiumDetailModal: React.FC<
  BaseModalProps<FeedPodiumDetailModalData>
> = ({
  handleClose,
  podium,
  brand1,
  brand2,
  brand3,
  collectibleData,
  isLastVoteForCombination = false,
  user,
  onMintSuccess,
  hasSucceeded = false,
  successType,
}) => {
  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  const {
    claimPodium,
    buyPodium,
    isClaimingPodium,
    isBuyingPodium,
    isApproving,
    isConfirming,
    error: txError,
  } = usePodiumCollectibles(
    (txData) => {
      console.log('Podium claimed!', txData);
      sdk.haptics.notificationOccurred('success');
      onMintSuccess?.();
      handleClose?.();
    },
    (txData) => {
      console.log('Podium bought!', txData);
      sdk.haptics.notificationOccurred('success');
      onMintSuccess?.();
      handleClose?.();
    }
  );

  const isMinted = collectibleData.isCollectible;
  const tokenId = collectibleData.tokenId;
  const ownerFid = collectibleData.ownerFid;
  const owner = collectibleData.ownerUsername;

  // Price calculations per contract:
  // - Mint price: BASE_PRICE (stored in collectibleData.price)
  // - Buy price: lastSalePrice * 1.2 (20% increase each sale)
  const lastSalePrice = collectibleData.price || '1000000000000000000000000'; // 1M BRND default
  const buyPrice = String(Math.floor(Number(lastSalePrice) * 1.2));

  const mintPrice = formatPrice(lastSalePrice);
  const displayBuyPrice = formatPrice(buyPrice);

  // Determine states based on contract logic:
  // - canMint: Current user is the podium creator AND was last to vote AND not minted yet
  // - canBuy: IS minted AND user is NOT the current owner
  // - isOwned: IS minted AND user IS the current owner
  // - isNotMintable: NOT minted AND (user was NOT last to vote OR current user is not the creator)
  const isCurrentOwner = isMinted && ownerFid === userFid;
  const isCreator = userFid === user?.fid;
  const canMint = isLastVoteForCombination && !isMinted && isCreator;
  const canBuy = isMinted && !isCurrentOwner;
  const isOwned = isCurrentOwner;
  const isNotMintable = !isMinted && (!isLastVoteForCombination || !isCreator);

  // Memoize time ago calculation
  const timeAgo = useMemo(() => getTimeAgo(podium?.date), [podium?.date]);

  // Haptic feedback when error occurs
  useEffect(() => {
    if (txError) {
      sdk.haptics.notificationOccurred('error');
    }
  }, [txError]);

  const handleBuyOrMint = async () => {
    if (isOwned || isNotMintable) return;
    sdk.haptics.impactOccurred('medium');
    if (canBuy && tokenId) {
      await buyPodium(tokenId);
    } else if (canMint) {
      const brandIds: [number, number, number] = [
        brand1.id,
        brand2.id,
        brand3.id,
      ];
      await claimPodium(brandIds);
    }
  };

  const isPending =
    isClaimingPodium || isBuyingPodium || isApproving || isConfirming;
  const isButtonDisabled = isPending || isOwned || isNotMintable || hasSucceeded;

  const getButtonText = (): string => {
    // Show success state first if transaction just succeeded
    if (hasSucceeded) {
      return successType === 'buy' ? 'Bought!' : 'Minted!';
    }
    if (canMint) return `Mint · ${mintPrice} $BRND`;
    if (isOwned) return 'Owned';
    if (isNotMintable) return 'Not mintable';
    if (canBuy) return `Buy · ${displayBuyPrice} $BRND`;
    return 'Not mintable';
  };

  const getLoadingText = (): string => {
    if (isApproving) return 'Approving...';
    if (isConfirming) return 'Confirming...';
    if (isClaimingPodium) return 'Minting...';
    if (isBuyingPodium) return 'Buying...';
    return getButtonText();
  };

  // Inline spinner component for loading state
  const Spinner = () => (
    <svg
      className={styles.spinner}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const getButtonStyle = () => {
    if (hasSucceeded) return styles.successButton;
    if (canMint) return styles.mintButton;
    if (isOwned) return styles.ownedButton;
    if (isNotMintable) return styles.notMintableButton;
    if (canBuy) return styles.buyButton;
    return styles.mintButton;
  };

  return (
    <div className={styles.container}>
      {/* Close Button */}
      <button
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="Close modal"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Podium Display */}
      <div className={styles.podiumDisplay}>
        <div className={styles.podiumContainer}>
          {/* Second place (left) */}
          <div className={styles.podiumItem}>
            {brand2?.imageUrl ? (
              <img
                src={brand2.imageUrl}
                alt={brand2.name}
                className={styles.brandImage}
              />
            ) : (
              <div className={styles.imagePlaceholder} />
            )}
            <div className={styles.numberContainer}>
              <Podium2Icon className={styles.numberIcon} />
            </div>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              className={styles.podiumLabel}
            >
              {brand2?.name ?? ''}
            </Typography>
          </div>

          {/* First place (center) */}
          <div className={classNames(styles.podiumItem, styles.firstPlace)}>
            {brand1?.imageUrl ? (
              <img
                src={brand1.imageUrl}
                alt={brand1.name}
                className={styles.brandImage}
              />
            ) : (
              <div className={styles.imagePlaceholder} />
            )}
            <div className={styles.numberContainer}>
              <Podium1Icon className={styles.numberIcon} />
            </div>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              className={styles.podiumLabel}
            >
              {brand1?.name ?? ''}
            </Typography>
          </div>

          {/* Third place (right) */}
          <div className={classNames(styles.podiumItem, styles.thirdPlace)}>
            {brand3?.imageUrl ? (
              <img
                src={brand3.imageUrl}
                alt={brand3.name}
                className={styles.brandImage}
              />
            ) : (
              <div className={styles.imagePlaceholder} />
            )}
            <div className={styles.numberContainer}>
              <Podium3Icon className={styles.numberIcon} />
            </div>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              className={styles.podiumLabel}
            >
              {brand3?.name ?? ''}
            </Typography>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        {/* Header with BRND PODIUM and date */}
        <div className={styles.infoHeader}>
          <div className={styles.titleRow}>
            <BRNDPodiumIcon className={styles.podiumIcon} />
          </div>
          {timeAgo && (
            <Typography
              variant="geist"
              weight="regular"
              size={12}
              className={styles.dateText}
            >
              {timeAgo}
            </Typography>
          )}
        </div>

        {/* Creator row */}
        <div className={styles.creatorRow}>
          <Typography
            variant="geist"
            weight="regular"
            size={10}
            className={styles.creatorLabel}
          >
            CREATOR
          </Typography>
          <div className={styles.creatorInfo}>
            {user?.photoUrl && (
              <img
                src={user.photoUrl}
                alt={user.username}
                className={styles.creatorAvatar}
              />
            )}
            <Typography
              variant="geist"
              weight="bold"
              size={12}
              className={styles.creatorUsername}
            >
              @{user?.username ?? ''}
            </Typography>
          </div>
        </div>

        {/* Owner row (only if minted) */}
        {isMinted && owner && (
          <div className={styles.creatorRow}>
            <Typography
              variant="geist"
              weight="regular"
              size={10}
              className={styles.creatorLabel}
            >
              OWNER
            </Typography>
            <div className={styles.creatorInfo}>
              {collectibleData.ownerPhotoUrl ? (
                <img
                  src={collectibleData.ownerPhotoUrl}
                  alt={owner}
                  className={styles.creatorAvatar}
                />
              ) : (
                <div className={styles.ownerAvatarPlaceholder} />
              )}
              <Typography
                variant="geist"
                weight="bold"
                size={12}
                className={styles.creatorUsername}
              >
                @{owner}
              </Typography>
            </div>
          </div>
        )}

        {/* Description */}
        <Typography
          variant="geist"
          weight="regular"
          size={12}
          className={styles.description}
        >
          BRND Podiums are onchain snapshots of brand culture on Web3. Each NFT
          is a signal of taste, influence, and participation in the evolving
          BRND network.
        </Typography>

        {/* Paid/Claimed info */}
        {podium?.brndPaidWhenCreatingPodium &&
          Number(podium.brndPaidWhenCreatingPodium) > 0 && (
          <div className={styles.paymentInfo}>
            <Typography size={12} className={styles.paidAmount}>
                Paid {podium.brndPaidWhenCreatingPodium} $BRND
            </Typography>
            {podium?.claimed && (
              <Typography size={12} className={styles.claimedAmount}>
                  Claimed {podium.brndPaidWhenCreatingPodium * 10} $BRND
              </Typography>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {txError && (
        <div className={styles.errorSection}>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            className={styles.errorText}
          >
            {txError}
          </Typography>
        </div>
      )}

      {/* Action Button - show for anyone who can mint, buy, see "not mintable", or just succeeded */}
      {(!isOwned || hasSucceeded) && (
        <div className={styles.actionSection}>
          <button
            className={classNames(
              styles.actionButton,
              getButtonStyle(),
              isButtonDisabled && styles.disabled,
              isPending && styles.loading
            )}
            onClick={handleBuyOrMint}
            disabled={isButtonDisabled}
          >
            {isPending ? (
              <>
                <Spinner />
                <Typography
                  variant="geist"
                  weight="bold"
                  size={14}
                  className={styles.actionButtonText}
                >
                  {getLoadingText()}
                </Typography>
              </>
            ) : (
              <Typography
                variant="geist"
                weight="bold"
                size={14}
                className={styles.actionButtonText}
              >
                {getButtonText()}
              </Typography>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
