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

interface IndividualPodiumProps {
  className?: string;
  brand1: PodiumBrand;
  brand2: PodiumBrand;
  brand3: PodiumBrand;
  collectibleData: CollectibleData;
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
  onMintClick,
  onBuyClick,
  isPending = false,
}) => {
  const { openModal } = useModal();

  const isMinted = collectibleData.isCollectible;
  const displayPrice = `${formatPrice(collectibleData.price)} $BRND`;
  const creator = collectibleData.genesisCreatorUsername;
  const owner = collectibleData.ownerUsername;

  const handleArrowClick = () => {
    openModal(ModalsIds.PODIUM_DETAIL, {
      brand1,
      brand2,
      brand3,
      collectibleData,
    });
  };

  const handleActionClick = () => {
    if (isPending) return;
    if (isMinted) {
      onBuyClick?.();
    } else {
      onMintClick?.();
    }
  };

  const podiumBrands = [
    { brand: brand2, icon: Podium2Icon, place: "second" as const },
    { brand: brand1, icon: Podium1Icon, place: "first" as const },
    { brand: brand3, icon: Podium3Icon, place: "third" as const },
  ];

  return (
    <div className={classNames(styles.container, className)}>
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
              {isMinted && creator ? `@${creator}` : "—"}
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
          <Typography
            variant="geist"
            weight="bold"
            size={10}
            lineHeight={13}
            className={styles.price}
          >
            {displayPrice}
          </Typography>
          <button
            className={classNames(
              styles.actionButton,
              isMinted ? styles.buyButton : styles.mintButton,
              isPending && styles.pending
            )}
            onClick={handleActionClick}
            disabled={isPending}
          >
            <Typography
              variant="geist"
              weight="bold"
              size={14}
              lineHeight={18}
              className={styles.actionButtonText}
            >
              {isPending ? "..." : isMinted ? "Buy" : "Mint"}
            </Typography>
          </button>
          <Typography
            variant="geist"
            weight="bold"
            size={10}
            lineHeight={13}
            className={styles.priceHidden}
          >
            {displayPrice}
          </Typography>
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
