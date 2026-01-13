// Dependencies
import React from "react";
import classNames from "clsx";

// StyleSheet
import styles from "./IndividualPodium.module.scss";

// Components
import Typography from "@/shared/components/Typography";
import Button from "@/shared/components/Button";

// Assets
import Podium1Icon from "@/shared/assets/icons/podium-1.svg?react";
import Podium2Icon from "@/shared/assets/icons/podium-2.svg?react";
import Podium3Icon from "@/shared/assets/icons/podium-3.svg?react";

// Hooks
import { useModal } from "@/shared/hooks/ui/useModal";
import { ModalsIds } from "@/shared/providers/ModalProvider/types";

interface Brand {
  id: number;
  name: string;
  imageUrl?: string;
}

interface IndividualPodiumProps {
  className?: string;
  brand1?: Brand;
  brand2?: Brand;
  brand3?: Brand;
  creator?: string;
  owner?: string;
  price?: string;
  onBuyClick?: () => void;
}

const IndividualPodium: React.FC<IndividualPodiumProps> = ({
  className,
  brand1,
  brand2,
  brand3,
  creator = "@jpfraneto",
  owner = "@esdotge",
  price = "10000 $BRND",
  onBuyClick,
}) => {
  const { openModal } = useModal();

  const handleArrowClick = () => {
    openModal(ModalsIds.PODIUM_DETAIL, {
      brand1: brand1
        ? { id: brand1.id, name: brand1.name, imageUrl: brand1.imageUrl }
        : undefined,
      brand2: brand2
        ? { id: brand2.id, name: brand2.name, imageUrl: brand2.imageUrl }
        : undefined,
      brand3: brand3
        ? { id: brand3.id, name: brand3.name, imageUrl: brand3.imageUrl }
        : undefined,
    });
  };

  // Use provided brands or fallback to hardcoded data
  // Order: 2nd place, 1st place, 3rd place (left to right)
  const podiumBrands = [
    {
      brand: brand2,
      name: brand2?.name || "Degen",
      color: "#8A60E3",
      icon: Podium2Icon,
      place: "second",
    },
    {
      brand: brand1,
      name: brand1?.name || "FLOC*",
      color: "#FF6B6B",
      icon: Podium1Icon,
      place: "first",
    },
    {
      brand: brand3,
      name: brand3?.name || "Poolsuite",
      color: "#4ECDC4",
      icon: Podium3Icon,
      place: "third",
    },
  ];

  return (
    <div className={classNames(styles.container, className)}>
      {/* Podium Elements */}
      <div className={styles.podiumSection}>
        <div className={styles.podiumContainer}>
          {podiumBrands.map((brand, index) => {
            const IconComponent = brand.icon;
            return (
              <div
                key={`podium-${index}`}
                className={classNames(styles.podiumItem, styles[brand.place])}
              >
                {brand.brand?.imageUrl ? (
                  <img
                    src={brand.brand.imageUrl}
                    alt={brand.name}
                    className={styles.brandImage}
                  />
                ) : (
                  <div
                    className={styles.imagePlaceholder}
                    style={{ backgroundColor: brand.color }}
                  />
                )}
                <div className={styles.numberContainer}>
                  <IconComponent className={styles.numberIcon} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Section */}
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
              {creator}
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
              {owner}
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
            {price}
          </Typography>
          <button
            className={styles.buyButton}
            onClick={onBuyClick || (() => {})}
          >
            <Typography
              variant="geist"
              weight="bold"
              size={14}
              lineHeight={18}
              className={styles.buyButtonText}
            >
              Buy
            </Typography>
          </button>
          <Typography
            variant="geist"
            weight="bold"
            size={10}
            lineHeight={13}
            className={styles.priceHidden}
          >
            {price}
          </Typography>
        </div>
      </div>

      {/* Arrow Button */}
      <div className={styles.arrowSection}>
        <button className={styles.arrowButton} onClick={handleArrowClick}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 6L9 12L15 18"
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
