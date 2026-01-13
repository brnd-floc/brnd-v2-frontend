// Dependencies
import React, { useState, useEffect, useRef } from "react";
import classNames from "clsx";
import { motion } from "framer-motion";

// Types
import { BaseModalProps } from "../../types";

// Components
import Typography from "@/shared/components/Typography";
import Button from "@/shared/components/Button";

// Assets
import Podium1Icon from "@/shared/assets/icons/podium-1.svg?react";
import Podium2Icon from "@/shared/assets/icons/podium-2.svg?react";
import Podium3Icon from "@/shared/assets/icons/podium-3.svg?react";

// StyleSheet
import styles from "./PodiumDetailModal.module.scss";
import sdk from "@farcaster/miniapp-sdk";

export type PodiumDetailModalData = {
  brand1?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  brand2?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  brand3?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
};

export const PodiumDetailModal: React.FC<
  BaseModalProps<PodiumDetailModalData>
> = ({ handleClose, brand1, brand2, brand3 }) => {
  const [activeTab, setActiveTab] = useState<"traits" | "activity">("traits");
  const [indicatorWidth, setIndicatorWidth] = useState<number>(0);
  const [indicatorOffset, setIndicatorOffset] = useState<number>(0);
  const traitsTabRef = useRef<HTMLButtonElement>(null);
  const activityTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateIndicator = () => {
      const activeTabRef =
        activeTab === "traits" ? traitsTabRef : activityTabRef;
      if (activeTabRef.current) {
        setIndicatorWidth(activeTabRef.current.clientWidth);
        setIndicatorOffset(activeTabRef.current.offsetLeft);
      }
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeTab]);

  const handleTabClick = (tab: "traits" | "activity") => {
    sdk.haptics.selectionChanged();
    setActiveTab(tab);
  };

  return (
    <div className={styles.container}>
      {/* Podium Display Section */}
      <div className={styles.podiumDisplay}>
        <button
          className={styles.closePodiumButton}
          onClick={handleClose}
          aria-label="Close podium"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className={styles.podiumContainer}>
          {/* 2nd Place (Left) */}
          <div className={styles.podiumItem}>
            {brand2?.imageUrl ? (
              <img
                src={brand2.imageUrl}
                alt={brand2.name}
                className={styles.brandImage}
              />
            ) : (
              <div
                className={styles.imagePlaceholder}
                style={{ backgroundColor: "#8A60E3" }}
              />
            )}
            <div className={styles.numberContainer}>
              <Podium2Icon className={styles.numberIcon} />
            </div>
            <Typography
              variant="geist"
              weight="bold"
              size={14}
              className={styles.podiumLabel}
            >
              {brand2?.name || "Degen"}
            </Typography>
          </div>

          {/* 1st Place (Center) */}
          <div className={classNames(styles.podiumItem, styles.firstPlace)}>
            {brand1?.imageUrl ? (
              <img
                src={brand1.imageUrl}
                alt={brand1.name}
                className={styles.brandImage}
              />
            ) : (
              <div
                className={styles.imagePlaceholder}
                style={{ backgroundColor: "#FF6B6B" }}
              />
            )}
            <div className={styles.numberContainer}>
              <Podium1Icon className={styles.numberIcon} />
            </div>
            <Typography
              variant="geist"
              weight="bold"
              size={14}
              className={styles.podiumLabel}
            >
              {brand1?.name || "FLOC*"}
            </Typography>
          </div>

          {/* 3rd Place (Right) */}
          <div className={classNames(styles.podiumItem, styles.thirdPlace)}>
            {brand3?.imageUrl ? (
              <img
                src={brand3.imageUrl}
                alt={brand3.name}
                className={styles.brandImage}
              />
            ) : (
              <div
                className={styles.imagePlaceholder}
                style={{ backgroundColor: "#4ECDC4" }}
              />
            )}
            <div className={styles.numberContainer}>
              <Podium3Icon className={styles.numberIcon} />
            </div>
            <Typography
              variant="geist"
              weight="bold"
              size={14}
              className={styles.podiumLabel}
            >
              {brand3?.name || "Poolsuite"}
            </Typography>
          </div>
        </div>
      </div>

      {/* Value and Benefits */}
      <div className={styles.valueBenefits}>
        <div className={styles.valueBox}>
          <Typography variant="geist" weight="bold" size={24} lineHeight={28}>
            1M
          </Typography>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
          >
            $BRND
          </Typography>
          <Typography
            variant="geist"
            weight="regular"
            size={10}
            lineHeight={14}
            className={styles.boxLabel}
          >
            VALUE
          </Typography>
        </div>
        <div className={styles.benefitsBox}>
          <Typography variant="geist" weight="bold" size={24} lineHeight={28}>
            1.2K
          </Typography>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
          >
            $BRND
          </Typography>
          <Typography
            variant="geist"
            weight="regular"
            size={10}
            lineHeight={14}
            className={styles.boxLabel}
          >
            BENEFITS
          </Typography>
        </div>
      </div>

      {/* BRND Podium Information */}
      <div className={styles.podiumInfo}>
        <div className={styles.podiumInfoHeader}>
          <Typography variant="druk" weight="wide" size={18} lineHeight={22}>
            BRND PODIUM
          </Typography>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
            className={styles.podiumId}
          >
            10-34-300
          </Typography>
        </div>
        <div className={styles.podiumInfoMeta}>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
          >
            OWNER @esdotge
          </Typography>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
            className={styles.nftNumber}
          >
            NFT #111
          </Typography>
        </div>
        <Typography
          variant="geist"
          weight="regular"
          size={14}
          lineHeight={20}
          className={styles.description}
        >
          BRND Podiums are onchain snapshots of brand culture on Web3. Each NFT
          is a signal of taste, influence, and participation in the evolving
          BRND network.
        </Typography>
        <div>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              ref={traitsTabRef}
              className={classNames(
                styles.tab,
                activeTab === "traits" && styles.active
              )}
              onClick={() => handleTabClick("traits")}
            >
              <Typography
                variant="druk"
                weight="wide"
                size={14}
                lineHeight={18}
              >
                TRAITS
              </Typography>
            </button>
            <button
              ref={activityTabRef}
              className={classNames(
                styles.tab,
                activeTab === "activity" && styles.active
              )}
              onClick={() => handleTabClick("activity")}
            >
              <Typography
                variant="druk"
                weight="wide"
                size={14}
                lineHeight={18}
              >
                ACTIVITY
              </Typography>
            </button>
            <motion.div
              className={styles.tabIndicator}
              initial={{ x: indicatorOffset, width: indicatorWidth }}
              animate={{ x: indicatorOffset, width: indicatorWidth }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === "traits" ? (
              <div className={styles.traitsContent}>
                <div className={styles.inputField}>
                  <Typography
                    variant="geist"
                    weight="regular"
                    size={12}
                    className={styles.inputLabel}
                  >
                    CREATOR
                  </Typography>
                  <div className={styles.inputValue}>
                    <Typography variant="geist" weight="medium" size={14}>
                      @jpfraneto
                    </Typography>
                  </div>
                </div>
                <div className={styles.inputField}>
                  <Typography
                    variant="geist"
                    weight="regular"
                    size={12}
                    className={styles.inputLabel}
                  >
                    SEASON
                  </Typography>
                  <div className={styles.inputValue}>
                    <Typography variant="geist" weight="medium" size={14}>
                      2
                    </Typography>
                  </div>
                </div>
                <div className={styles.traitBoxes}>
                  <div className={styles.traitBox}>
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={12}
                      lineHeight={16}
                    >
                      P1
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={10}
                      lineHeight={14}
                    >
                      {brand1?.name || "FLOC*"}
                    </Typography>
                  </div>
                  <div className={styles.traitBox}>
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={12}
                      lineHeight={16}
                    >
                      P2
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={10}
                      lineHeight={14}
                    >
                      {brand2?.name || "Degen"}
                    </Typography>
                  </div>
                  <div className={styles.traitBox}>
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={12}
                      lineHeight={16}
                    >
                      P3
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={10}
                      lineHeight={14}
                    >
                      {brand3?.name || "Poolsuite"}
                    </Typography>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.activityContent}>
                <div className={styles.activityTable}>
                  <div className={styles.tableHeader}>
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={12}
                      lineHeight={16}
                    >
                      EVENT
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={12}
                      lineHeight={16}
                    >
                      PRICE
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={12}
                      lineHeight={16}
                    >
                      FROM
                    </Typography>
                  </div>
                  <div className={styles.tableRow}>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      Sale
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0.0222 BRND
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0xF9..1F96
                    </Typography>
                  </div>
                  <div className={styles.tableRow}>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      Item Offer
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0.0222 BRND
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0xF9..1F96
                    </Typography>
                  </div>
                  <div className={styles.tableRow}>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      Listing
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0.0222 BRND
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0xF9..1F96
                    </Typography>
                  </div>
                  <div className={styles.tableRow}>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      Transfer
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0.0222 BRND
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      0xF9..1F96
                    </Typography>
                  </div>
                  <div className={styles.tableRow}>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      Mint
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      -
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      NullAddress
                    </Typography>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buy Now Section */}
      <div className={styles.buySection}>
        <div className={styles.buySectionContent}>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
            className={styles.buyLabel}
          >
            BUY FOR
          </Typography>
          <Typography
            variant="druk"
            weight="wide"
            size={24}
            lineHeight={28}
            className={styles.buyPrice}
          >
            2M $BRND
          </Typography>
        </div>

        <button onClick={() => {}} className={styles.buyNowButton}>
          <Typography variant="geist" weight="bold" size={14} lineHeight={18}>
            Buy Now
          </Typography>
        </button>
      </div>
    </div>
  );
};
