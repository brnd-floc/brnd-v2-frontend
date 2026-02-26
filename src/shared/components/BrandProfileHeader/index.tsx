// src/shared/components/BrandProfileHeader/index.tsx

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import sdk from '@farcaster/miniapp-sdk';

// StyleSheet
import styles from './BrandProfileHeader.module.scss';

// Components
import Typography from '@/components/Typography';
import IconButton from '@/components/IconButton';

// Assets
import ExportIcon from '@/assets/icons/export-icon.svg?react';

// Utils
import { shortenNumber } from '@/utils/number';

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
        return profile.startsWith('@') ? profile : `@${profile}`;
      }

      if (brand?.channel) {
        const channel = brand.channel;
        // If channel starts with "/", keep it; otherwise add it
        return channel.startsWith('/') ? channel : `/${channel}`;
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
            SEASON 2 SCORE
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
              className={styles.trendText}
            >
              7d{' '}
              {voteTrend7d > 0
                ? `+${shortenNumber(voteTrend7d)}`
                : voteTrend7d < 0
                  ? shortenNumber(voteTrend7d)
                  : '0'}
            </Typography>
            <span
              className={`${styles.trendArrow} ${
                voteTrend7d > 0 ? styles.arrowUp : ''
              }`}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 2L10 7H2L6 2Z"
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
