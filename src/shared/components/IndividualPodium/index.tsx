import React from "react";
import classNames from "clsx";
import styles from "./IndividualPodium.module.scss";
import Typography from "@/shared/components/Typography";
import Podium1Icon from "@/shared/assets/icons/podium-1.svg?react";
import Podium2Icon from "@/shared/assets/icons/podium-2.svg?react";
import Podium3Icon from "@/shared/assets/icons/podium-3.svg?react";
import { useModal } from "@/shared/hooks/ui/useModal";
import { ModalsIds } from "@/shared/providers/ModalProvider/types";
import { PodiumBrand, CollectibleData } from "@/shared/types/collectibles";
import { useAuth } from "@/shared/hooks/auth";
import { User } from "@/shared/hooks/user";

interface IndividualPodiumProps {
  className?: string;
  brand1: PodiumBrand;
  brand2: PodiumBrand;
  brand3: PodiumBrand;
  user: User;
  collectibleData: CollectibleData;
  isLastVoteForCombination?: boolean;
  onMintClick?: () => void;
  onBuyClick?: () => void;
  isPending?: boolean;
}

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

const IndividualPodium: React.FC<IndividualPodiumProps> = ({
  className,
  brand1,
  brand2,
  brand3,
  collectibleData,
  isLastVoteForCombination = false,
  onMintClick,
  onBuyClick,
  user,
  isPending = false,
}) => {
  const { openModal } = useModal();

  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  const isMinted = collectibleData.isCollectible;
  const displayPrice = `${formatPrice(collectibleData.price)} $BRND`;
  const creator = collectibleData.genesisCreatorUsername;
  const owner = collectibleData.ownerUsername;

  // Determine mintability state
  // - isLastVoteForCombination: true + isCollectible: false → "Mint" (can mint)
  // - isLastVoteForCombination: true + isCollectible: true → "Owned" (already minted by user)
  // - isLastVoteForCombination: false + isCollectible: false → "Not mintable" (someone else voted after)
  // - isLastVoteForCombination: false + isCollectible: true → "Buy" (minted by someone else)
  const canMint = isLastVoteForCombination && !isMinted;
  const isOwned = isLastVoteForCombination && isMinted;
  const isNotMintable = !isLastVoteForCombination && !isMinted;
  const canBuy = !isLastVoteForCombination && isMinted;

  const handleArrowClick = () => {
    openModal(ModalsIds.PODIUM_DETAIL, {
      brand1,
      brand2,
      brand3,
      collectibleData,
    });
  };

  const handleActionClick = () => {
    if (isPending || isOwned || isNotMintable) return;
    if (canBuy) {
      onBuyClick?.();
    } else if (canMint) {
      onMintClick?.();
    }
  };

  const getButtonText = () => {
    if (canMint) return "Mint";
    if (isOwned) return "Owned";
    if (isNotMintable) return "Not mintable";
    if (canBuy) return "Buy";
    return "Mint";
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
    if (canMint) return styles.mintButton;
    if (isOwned) return styles.ownedButton;
    if (isNotMintable) return styles.notMintableButton;
    if (canBuy) return styles.buyButton;
    return styles.mintButton;
  };

  const isButtonDisabled = isPending || isOwned || isNotMintable;

  const podiumBrands = [
    { brand: brand2, icon: Podium2Icon, place: "second" as const },
    { brand: brand1, icon: Podium1Icon, place: "first" as const },
    { brand: brand3, icon: Podium3Icon, place: "third" as const },
  ];

  return (
    <div className={classNames(styles.container, className)}>
      <div className={styles.podiumOuterContainer}>
        <div className={styles.podiumSection}>
          <div className={styles.podiumContainer}>
            {podiumBrands.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={`podium-${index}`}
                  className={classNames(styles.podiumItem, styles[item.place])}
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

        <div className={styles.detailsSection}>
          <div className={styles.infoTop}>
            <div className={styles.creatorItem}>
              <Typography
                variant="geist"
                weight="regular"
                size={10}
                lineHeight={13}
                className={styles.label}
              >
                Creator
              </Typography>
              <Typography
                variant="geist"
                weight="bold"
                size={12}
                lineHeight={16}
                className={styles.value}
              >
                @{user.username}
              </Typography>
            </div>
            <div className={styles.ownerItem}>
              <Typography
                variant="geist"
                weight="regular"
                size={10}
                lineHeight={13}
                className={styles.label}
              >
                Owner
              </Typography>
              <Typography
                variant="geist"
                weight="bold"
                size={12}
                lineHeight={16}
                className={styles.value}
              >
                {isMinted && owner ? `@${owner}` : "—"}
              </Typography>
            </div>
          </div>

          <div className={styles.infoBottom}>
            {collectibleData.ownerFid !== userFid && (
              <div className={styles.priceContainer}>
                {(canMint || canBuy) && (
                  <Typography
                    variant="geist"
                    weight="bold"
                    size={10}
                    lineHeight={13}
                    className={styles.price}
                  >
                    {displayPrice}
                  </Typography>
                )}
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
                  {isPending ? (
                    <Spinner />
                  ) : (
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={14}
                      lineHeight={18}
                      className={styles.actionButtonText}
                    >
                      {getButtonText()}
                    </Typography>
                  )}
                </button>
                {(canMint || canBuy) && (
                  <Typography
                    variant="geist"
                    weight="bold"
                    size={10}
                    lineHeight={13}
                    className={styles.priceHidden}
                  >
                    {displayPrice}
                  </Typography>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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

export default IndividualPodium;
