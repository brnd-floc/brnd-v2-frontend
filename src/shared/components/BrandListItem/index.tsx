import React from "react";
import classNames from "clsx";
import sdk from "@farcaster/miniapp-sdk";

interface BrandListItemProps {
  name: string;
  photoUrl: string;
  score: number;
  position: number;
  variation: "up" | "down" | "equal" | "hide";
  onClick: () => void;
  // Optional extended fields
  category?: {
    id: number;
    name: string;
  } | null;
  guardianHandle?: string | null;
  guardianPfp?: string | null;
  guardianFid?: number | null;
  ticker?: string | null;
}

// StyleSheet
import styles from "./BrandListItem.module.scss";

// Components
import Typography from "../Typography";

export const BrandListItem: React.FC<BrandListItemProps> = ({
  name,
  photoUrl,
  position,
  score,
  onClick,
  category,
  guardianHandle,
  guardianPfp,
  guardianFid,
  ticker,
}) => {
  const hasExtendedInfo = category?.name || guardianHandle || ticker;

  const handleGuardianClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (guardianFid) {
      sdk.actions.viewProfile({ fid: guardianFid });
    }
  };

  return (
    <button onClick={onClick} className={styles.layout}>
      <div className={styles.mainRow}>
        <Typography size={14} lineHeight={14} className={styles.position}>
          {position}
        </Typography>
        <div className={styles.row}>
          <img className={styles.img} src={photoUrl} width={32} height={32} />
          <Typography size={14} lineHeight={18}>
            {name}
          </Typography>
        </div>
        <div className={classNames(styles.row, styles.score)}>
          <Typography size={14} lineHeight={14}>
            {score}
          </Typography>
        </div>
      </div>
      {hasExtendedInfo && (
        <div className={styles.extendedRow}>
          {category?.name && (
            <span className={styles.categoryPill}>
              <Typography size={10} lineHeight={12}>
                {category.name}
              </Typography>
            </span>
          )}
          {guardianHandle && (
            <span
              className={styles.guardianInfo}
              onClick={handleGuardianClick}
            >
              {guardianPfp && (
                <img
                  src={guardianPfp}
                  alt=""
                  className={styles.guardianAvatar}
                />
              )}
              <Typography size={10} lineHeight={12} className={styles.guardianHandle}>
                @{guardianHandle}
              </Typography>
            </span>
          )}
          {ticker && (
            <span className={styles.tickerPill}>
              <Typography size={10} lineHeight={12}>
                {ticker}
              </Typography>
            </span>
          )}
        </div>
      )}
    </button>
  );
};
