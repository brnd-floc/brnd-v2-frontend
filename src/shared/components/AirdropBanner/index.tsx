// Dependencies
import React from "react";
import { useNavigate } from "react-router-dom";

// StyleSheet
import styles from "./AirdropBanner.module.scss";
import BrndPowerTextSvg from "@/shared/assets/images/brnd-power-text.svg?react";
import sdk from "@farcaster/miniapp-sdk";

function AirdropBanner(): React.ReactNode {
  const navigate = useNavigate();

  const handleClick = () => {
    sdk.haptics.selectionChanged();

    // Navigate to Power page on user's profile
    navigate("/profile/power");
  };

  return (
    <div className={styles.banner} onClick={handleClick}>
      <div className={styles.mainContent}>
        <BrndPowerTextSvg />
      </div>
      <div className={styles.arrowSection}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18L15 12L9 6"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default AirdropBanner;
