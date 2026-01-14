import React, { useState, useEffect, useRef } from "react";
import classNames from "clsx";
import { motion } from "framer-motion";
import sdk from "@farcaster/miniapp-sdk";
import { BaseModalProps } from "../../types";
import Typography from "@/shared/components/Typography";
import Button from "@/shared/components/Button";
import Podium1Icon from "@/shared/assets/icons/podium-1.svg?react";
import Podium2Icon from "@/shared/assets/icons/podium-2.svg?react";
import Podium3Icon from "@/shared/assets/icons/podium-3.svg?react";
import { usePodiumCollectibles } from "@/shared/hooks/contract/usePodiumCollectibles";
import {
  ActivityEvent,
  PodiumDetailModalData,
} from "@/shared/types/collectibles";
import { request } from "@/services/api";
import { BLOCKCHAIN_SERVICE } from "@/config/api";
import styles from "./PodiumDetailModal.module.scss";
import { useAuth } from "@/shared/hooks/auth";

const formatPrice = (priceStr: string | null): string => {
  if (!priceStr) return "1M";
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

export const PodiumDetailModal: React.FC<
  BaseModalProps<PodiumDetailModalData>
> = ({ handleClose, brand1, brand2, brand3, collectibleData }) => {
  const [activeTab, setActiveTab] = useState<"traits" | "activity">("traits");
  const [indicatorWidth, setIndicatorWidth] = useState<number>(0);
  const [indicatorOffset, setIndicatorOffset] = useState<number>(0);
  const [activityHistory, setActivityHistory] = useState<ActivityEvent[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const traitsTabRef = useRef<HTMLButtonElement>(null);
  const activityTabRef = useRef<HTMLButtonElement>(null);

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
    brndBalance,
  } = usePodiumCollectibles(
    (txData) => {
      console.log("🎉 Podium claimed!", txData);
      sdk.haptics.notificationOccurred("success");
      handleClose?.();
    },
    (txData) => {
      console.log("🎉 Podium bought!", txData);
      sdk.haptics.notificationOccurred("success");
      handleClose?.();
    }
  );

  const isMinted = collectibleData.isCollectible;
  const tokenId = collectibleData.tokenId;
  const currentPrice = collectibleData.price || "1000000000000000000000000";
  const totalFeesEarned = collectibleData.totalFeesEarned || "0";
  const creator = collectibleData.genesisCreatorUsername;
  const owner = collectibleData.ownerUsername;
  const podiumId = `${brand1?.id ?? 0}-${brand2?.id ?? 0}-${brand3?.id ?? 0}`;

  // Fetch activity when tab changes to activity
  useEffect(() => {
    if (
      activeTab === "activity" &&
      isMinted &&
      tokenId &&
      activityHistory.length === 0
    ) {
      setLoadingActivity(true);
      request<ActivityEvent[]>(
        `${BLOCKCHAIN_SERVICE}/collectible-activity/${tokenId}`,
        {
          method: "GET",
        }
      )
        .then((data) => {
          setActivityHistory(data || []);
        })
        .catch((err) => {
          console.error("Failed to fetch activity:", err);
        })
        .finally(() => {
          setLoadingActivity(false);
        });
    }
  }, [activeTab, isMinted, tokenId, activityHistory.length]);

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

  const handleBuyOrMint = async () => {
    sdk.haptics.impactOccurred("medium");
    if (isMinted && tokenId) {
      await buyPodium(tokenId);
    } else {
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

  const getButtonText = (): string => {
    if (isApproving) return "Approving...";
    if (isConfirming) return "Confirming...";
    if (isClaimingPodium) return "Minting...";
    if (isBuyingPodium) return "Buying...";
    return isMinted ? "Buy Now" : "Mint Now";
  };

  const formatEventType = (type: string): string => {
    const labels: Record<string, string> = { mint: "Mint", sale: "Sale" };
    return labels[type] || type;
  };

  const truncateAddress = (address: string): string => {
    if (!address || address.length < 10) return address || "—";
    return `${address.slice(0, 4)}..${address.slice(-4)}`;
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
              size={14}
              className={styles.podiumLabel}
            >
              {brand2?.name ?? "—"}
            </Typography>
          </div>
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
              size={14}
              className={styles.podiumLabel}
            >
              {brand1?.name ?? "—"}
            </Typography>
          </div>
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
              size={14}
              className={styles.podiumLabel}
            >
              {brand3?.name ?? "—"}
            </Typography>
          </div>
        </div>
      </div>

      {/* Value and Benefits */}
      <div className={styles.valueBenefits}>
        <div className={styles.valueBox}>
          <Typography variant="geist" weight="bold" size={24} lineHeight={28}>
            {formatPrice(currentPrice)}
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
            {formatPrice(totalFeesEarned)}
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

      {/* Podium Info */}
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
            {podiumId}
          </Typography>
        </div>
        <div className={styles.podiumInfoMeta}>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
          >
            OWNER {isMinted && owner ? `@${owner}` : "—"}
          </Typography>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
            className={styles.nftNumber}
          >
            {isMinted && tokenId ? `NFT #${tokenId}` : "Not Minted"}
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
      </div>

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
          <Typography variant="druk" weight="wide" size={14} lineHeight={18}>
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
          <Typography variant="druk" weight="wide" size={14} lineHeight={18}>
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
                  {isMinted && creator ? `@${creator}` : "—"}
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
                  {brand1?.name ?? "—"}
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
                  {brand2?.name ?? "—"}
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
                  {brand3?.name ?? "—"}
                </Typography>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.activityContent}>
            {loadingActivity ? (
              <div className={styles.emptyActivity}>
                <Typography variant="geist" weight="regular" size={12}>
                  Loading...
                </Typography>
              </div>
            ) : (
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
                {activityHistory.length > 0 ? (
                  activityHistory.map((event, index) => (
                    <div key={index} className={styles.tableRow}>
                      <Typography
                        variant="geist"
                        weight="regular"
                        size={12}
                        lineHeight={16}
                      >
                        {formatEventType(event.eventType)}
                      </Typography>
                      <Typography
                        variant="geist"
                        weight="regular"
                        size={12}
                        lineHeight={16}
                      >
                        {event.price ? `${formatPrice(event.price)} BRND` : "—"}
                      </Typography>
                      <Typography
                        variant="geist"
                        weight="regular"
                        size={12}
                        lineHeight={16}
                      >
                        {event.fromUser?.username
                          ? `@${event.fromUser.username}`
                          : truncateAddress(event.fromWallet)}
                      </Typography>
                    </div>
                  ))
                ) : isMinted ? (
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
                      —
                    </Typography>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={12}
                      lineHeight={16}
                    >
                      {creator ? `@${creator}` : "—"}
                    </Typography>
                  </div>
                ) : (
                  <div className={styles.emptyActivity}>
                    <Typography variant="geist" weight="regular" size={12}>
                      No activity yet
                    </Typography>
                  </div>
                )}
              </div>
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

      {/* Buy Section */}
      {collectibleData.ownerFid !== userFid && (
        <div className={styles.buySection}>
          <Typography
            variant="geist"
            weight="regular"
            size={12}
            lineHeight={16}
            className={styles.buyLabel}
          >
            {isMinted ? "BUY FOR" : "MINT FOR"}
          </Typography>
          <Typography
            variant="druk"
            weight="wide"
            size={24}
            lineHeight={28}
            className={styles.buyPrice}
          >
            {formatPrice(currentPrice)} $BRND
          </Typography>
          <Button
            variant="primary"
            caption={getButtonText()}
            className={classNames(
              styles.buyNowButton,
              isPending && styles.pending
            )}
            onClick={handleBuyOrMint}
            disabled={isPending}
          />
          <Typography
            variant="geist"
            weight="regular"
            size={10}
            lineHeight={14}
            className={styles.balanceInfo}
          >
            Your balance:{" "}
            {formatPrice(
              brndBalance ? (Number(brndBalance) * 1e18).toString() : "0"
            )}{" "}
            $BRND
          </Typography>
        </div>
      )}
    </div>
  );
};
