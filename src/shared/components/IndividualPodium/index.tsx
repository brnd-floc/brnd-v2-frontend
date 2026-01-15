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
import { useAccount, useConnect } from "wagmi";
import sdk from "@farcaster/miniapp-sdk";

export interface IndividualPodiumProps {
  className?: string;
  podium?: {
    brand1: PodiumBrand;
    brand2: PodiumBrand;
    brand3: PodiumBrand;
    user: {
      username: string;
      fid: number;
    };
    claimed: boolean;
    brndPaidWhenCreatingPodium: number | null;
    collectibleClaimCount: number; // 0
    collectibleGenesisCreatorFid: number | null; // null
    collectibleGenesisCreatorUsername: string | null; // null
    collectibleOwnerFid: number | null; // null
    collectibleOwnerUsername: string | null; // null
    collectiblePrice: string | null; // null
    collectibleTokenId: string | null; // null
    collectibleTotalFeesEarned: string; // "0"
    date: string; // "2026-01-14T16:53:17.000Z"
    id: string; // "0x5f2b47faccf19589322a47c6b4dd334b5d9df1c5ed83cc629e74906d4d0104c2"
    isCollectible: boolean; // false
    isLastVoteForCombination?: boolean; // true
    collectibleOwner?: User;
  };
  brand1: PodiumBrand;
  brand2: PodiumBrand;
  brand3: PodiumBrand;
  user: User;
  collectibleData: CollectibleData;
  isLastVoteForCombination?: boolean;
  onMintClick?: () => void;
  onBuyClick?: () => void;
  onMintSuccess?: () => void;
  isPending?: boolean;
  hasSucceeded?: boolean; // Optimistic update after successful transaction
}

// Format large numbers (1000000 -> "1M", 1200000 -> "1.2M")
// const formatPrice = (priceStr: string | null): string => {
//   if (!priceStr) return "1M";
//   // Price comes in wei (18 decimals), convert to BRND
//   const priceInBrnd = Number(priceStr) / 1e18;
//   if (priceInBrnd >= 1000000) {
//     const millions = priceInBrnd / 1000000;
//     return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
//   } else if (priceInBrnd >= 1000) {
//     const thousands = priceInBrnd / 1000;
//     return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
//   }
//   return priceInBrnd.toFixed(0);
// };

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
  hasSucceeded = false,
}) => {
  const { openModal } = useModal();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  // Apply optimistic update if transaction succeeded
  const isMinted = hasSucceeded || collectibleData.isCollectible;
  const ownerFid = hasSucceeded ? userFid : collectibleData.ownerFid;
  const owner = hasSucceeded ? authData?.username : collectibleData.ownerUsername;

  // Price calculations per contract:
  // - Mint price: BASE_PRICE (stored in collectibleData.price)
  // - Buy price: lastSalePrice * 1.2 (20% increase each sale)
  // const lastSalePrice = collectibleData.price || "1000000000000000000000000"; // 1M BRND default
  // const buyPrice = String(Math.floor(Number(lastSalePrice) * 1.2));

  // const mintPrice = formatPrice(lastSalePrice);
  // const displayBuyPrice = formatPrice(buyPrice);

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

  const handleArrowClick = () => {
    openModal(ModalsIds.PODIUM_DETAIL, {
      brand1,
      brand2,
      brand3,
      user,
      collectibleData,
      isLastVoteForCombination,
    });
  };

  const handleActionClick = () => {
    if (isPending || isOwned || isNotMintable) return;

    // If wallet is not connected, connect it first
    if (!isConnected) {
      sdk.haptics.selectionChanged();
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
    if (canMint) return `Mint`;
    if (isOwned) return "Owned";
    if (isNotMintable) return "N/A";
    if (canBuy) return `Buy`;
    return "N/A";
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
            <div className={styles.priceContainer}>
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
            </div>
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
