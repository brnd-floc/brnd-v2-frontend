// src/shared/components/BrandHeader/index.tsx

import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import classNames from "clsx";

// StyleSheet
import styles from "./BrandHeader.module.scss";

// Components
import Typography from "@/components/Typography";
import IconButton from "@/components/IconButton";
import BrandsList from "@/components/BrandsList";

// Assets
import Logo from "@/assets/images/logo.svg";
import BPointIcon from "@/assets/icons/point-b.svg?react";
import GoBackIcon from "@/assets/icons/go-back-icon.svg?react";

// Hooks
import { useAuth } from "@/hooks/auth";
import useBottomSheet from "@/hooks/ui/useBottomSheet";
import sdk from "@farcaster/miniapp-sdk";

interface BrandHeaderProps {
  className?: string;
  showBackButton?: boolean;
  backButtonPath?: string;
  showUserProfile?: boolean;
  showUserPoints?: boolean;
  onBackClick?: () => void;
}

const BrandHeader: React.FC<BrandHeaderProps> = ({
  className,
  showBackButton = true,
  backButtonPath = "/",
  showUserProfile = true,
  showUserPoints = true,
  onBackClick,
}) => {
  const navigate = useNavigate();
  const { data } = useAuth();
  const { open, close } = useBottomSheet();

  const handleClickProfile = useCallback(() => {
    sdk.haptics.selectionChanged();
    navigate("/profile");
  }, [navigate]);

  const handleBackClick = useCallback(() => {
    sdk.haptics.selectionChanged();
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(backButtonPath);
    }
  }, [onBackClick, navigate, backButtonPath]);

  const handleOpenBrandsSearch = useCallback(() => {
    sdk.haptics.selectionChanged();
    open(
      <div className={styles.brandsSearchModal}>
        <BrandsList
          isSelectable={true}
          isFinderEnabled={true}
          config={{
            limit: 50,
            order: "all",
          }}
          onSelect={(brand) => {
            sdk.haptics.selectionChanged();
            close();
            navigate(`/brand/${brand.id}`);
          }}
        />
      </div>
    );
  }, [open, close, navigate]);

  return (
    <div className={classNames(styles.header, className)}>
      {showBackButton ? (
        <div className={styles.left}>
          <IconButton
            variant="solid"
            icon={<GoBackIcon />}
            onClick={handleBackClick}
            className={styles.backBtn}
          />
        </div>
      ) : (
        <div onClick={handleOpenBrandsSearch}>
          {/* Magnifying glass SVG */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="#bbbbbb"
              strokeWidth="2"
              fill="none"
            />
            <line
              x1="16.4142"
              y1="16"
              x2="21"
              y2="20.5858"
              stroke="#bbbbbb"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      <img src={Logo} className={styles.logo} alt="BRND Logo" />

      {showUserProfile && (
        <button className={styles.profileButton} onClick={handleClickProfile}>
          {showUserPoints && (
            <div className={styles.points}>
              <Typography weight="regular" size={14} lineHeight={18}>
                {data?.points}
              </Typography>
              <BPointIcon width={15} height={12} />
            </div>
          )}

          <div className={styles.avatarWrapper}>
            <img
              alt={data?.username}
              className={styles.avatar}
              src={data?.photoUrl}
              width={32}
              height={32}
            />
          </div>
        </button>
      )}
    </div>
  );
};

export default BrandHeader;
