// src/shared/components/BrandProfileHeader/index.tsx

import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import sdk from "@farcaster/miniapp-sdk";

// StyleSheet
import styles from "./BrandProfileHeader.module.scss";

// Components
import Typography from "@/components/Typography";
import IconButton from "@/components/IconButton";

// Assets
import ExportIcon from "@/assets/icons/export-icon.svg?react";

// Utils
import { shortenNumber } from "@/utils/number";

interface BrandProfileHeaderProps {
  brand: {
    id: number;
    name: string;
    imageUrl: string;
    url?: string;
    profile?: string;
    channel?: string;
    score: number;
  };
  voteTrend7d?: number;
  onBackClick?: () => void;
}

const BrandProfileHeader: React.FC<BrandProfileHeaderProps> = ({
  brand,
  voteTrend7d = 0,
  onBackClick,
}) => {
  const navigate = useNavigate();

  const handleBackClick = useCallback(() => {
    sdk.haptics.selectionChanged();
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  }, [onBackClick, navigate]);

  const handleClickShare = useCallback(() => {
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

    const formattedProfileOrChannel = getProfileOrChannel(brand);
    if (brand?.id) {
      sdk.actions.composeCast({
        text: `Check out this brand on @BRND:\n\n${brand?.name} - ${formattedProfileOrChannel}`,
        embeds: [`${import.meta.env.VITE_API_URL}/embeds/brand/${brand?.id}`],
      });
    }
  }, [brand]);

  return (
    <div className={styles.wrapper}>
      {/* Top Header */}
      <div className={styles.header}>
        <Typography
          variant="druk"
          weight="wide"
          size={24}
          lineHeight={24}
          className={styles.brandName}
        >
          {brand.name}
        </Typography>
        <div className={styles.buttonContainer}>
          <IconButton
            icon={<ExportIcon />}
            variant="secondary"
            onClick={handleClickShare}
            className={styles.actionButton}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Left: Back Button */}
        <div onClick={handleBackClick} className={styles.backButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Center: Brand Image Card */}
        <div className={styles.brandImageContainer}>
          <img
            className={styles.brandImage}
            src={brand.imageUrl}
            alt={brand.name}
          />
        </div>

        {/* Right: Score Card */}
        <div
          className={`${styles.scoreCard} ${
            voteTrend7d > 0
              ? styles.scoreCardPositive
              : voteTrend7d < 0
              ? styles.scoreCardNegative
              : styles.scoreCardNeutral
          }`}
        >
          <Typography
            variant="druk"
            weight="wide"
            size={10}
            lineHeight={14}
            className={styles.scoreLabelSCORE}
          >
            SCORE
          </Typography>
          <div className={styles.scoreValueContainer}>
            <Typography
              variant="druk"
              weight="wide"
              size={24}
              lineHeight={28}
              className={styles.scoreValue}
            >
              {shortenNumber(brand.score)}
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={10}
              lineHeight={14}
              className={styles.scoreLabelBRND}
            >
              $BRND
            </Typography>
          </div>
          {/* 7d Trend Indicator */}
          <div
            className={`${styles.trendIndicator} ${
              voteTrend7d > 0
                ? styles.trendPositive
                : voteTrend7d < 0
                ? styles.trendNegative
                : styles.trendNeutral
            }`}
          >
            <Typography
              variant="geist"
              weight="medium"
              size={10}
              lineHeight={12}
              className={styles.trendLabelContainer}
            >
              <Typography
                variant="geist"
                weight="medium"
                size={10}
                lineHeight={12}
                className={styles.trendLabel}
              >
                7d{" "}
              </Typography>
              <Typography
                variant="geist"
                weight="medium"
                size={10}
                lineHeight={12}
                className={styles.trendValue}
              >
                {voteTrend7d > 0
                  ? `+${shortenNumber(voteTrend7d)}`
                  : voteTrend7d < 0
                  ? shortenNumber(voteTrend7d)
                  : "0"}{" "}
                votes
              </Typography>
            </Typography>
            <span
              className={`${styles.trendArrow} ${
                voteTrend7d > 0 ? styles.arrowUp : ""
              }`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1.98448 2.89002C1.94964 2.85518 1.922 2.81381 1.90314 2.76829C1.88429 2.72277 1.87458 2.67398 1.87458 2.62471C1.87458 2.57543 1.88429 2.52664 1.90314 2.48112C1.922 2.4356 1.94964 2.39423 1.98448 2.35939C2.01932 2.32455 2.06068 2.29691 2.10621 2.27806C2.15173 2.2592 2.20052 2.2495 2.24979 2.2495C2.29906 2.2495 2.34786 2.2592 2.39338 2.27806C2.4389 2.29691 2.48026 2.32455 2.5151 2.35939L5.99979 5.84455L9.48448 2.35939C9.55484 2.28903 9.65028 2.2495 9.74979 2.2495C9.8493 2.2495 9.94474 2.28903 10.0151 2.35939C10.0855 2.42976 10.125 2.52519 10.125 2.62471C10.125 2.72422 10.0855 2.81965 10.0151 2.89002L6.2651 6.64002C6.23028 6.67488 6.18892 6.70254 6.14339 6.72142C6.09787 6.74029 6.04907 6.75 5.99979 6.75C5.95051 6.75 5.90171 6.74029 5.85619 6.72142C5.81066 6.70254 5.76931 6.67488 5.73448 6.64002L1.98448 2.89002ZM9.48448 6.10939L5.99979 9.59455L2.5151 6.10939C2.48026 6.07455 2.4389 6.04691 2.39338 6.02806C2.34786 6.0092 2.29906 5.9995 2.24979 5.9995C2.20052 5.9995 2.15173 6.0092 2.10621 6.02806C2.06068 6.04691 2.01932 6.07455 1.98448 6.10939C1.94964 6.14423 1.922 6.1856 1.90314 6.23112C1.88429 6.27664 1.87458 6.32543 1.87458 6.37471C1.87458 6.42398 1.88429 6.47277 1.90314 6.51829C1.922 6.56381 1.94964 6.60518 1.98448 6.64002L5.73448 10.39C5.76931 10.4249 5.81066 10.4525 5.85619 10.4714C5.90171 10.4903 5.95051 10.5 5.99979 10.5C6.04907 10.5 6.09787 10.4903 6.14339 10.4714C6.18892 10.4525 6.23028 10.4249 6.2651 10.39L10.0151 6.64002C10.0855 6.56965 10.125 6.47422 10.125 6.37471C10.125 6.27519 10.0855 6.17976 10.0151 6.10939C9.94474 6.03903 9.8493 5.9995 9.74979 5.9995C9.65028 5.9995 9.55484 6.03903 9.48448 6.10939Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandProfileHeader;
