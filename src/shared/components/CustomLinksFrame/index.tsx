// Dependencies
import React, { useState, useEffect } from "react";

// StyleSheet
import styles from "./CustomLinksFrame.module.scss";
import Typography from "../Typography";
import sdk from "@farcaster/miniapp-sdk";
import { useNavigate } from "react-router-dom";

function CustomLinksFrame(): React.ReactNode {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  const linksData = [
    {
      id: 1,
      text: "BRND Power",
      action: () => {
        navigate("/profile/power");
      },
    },
    {
      id: 2,
      text: "Follow @BRND",
      action: () => {
        sdk.actions.viewProfile({
          fid: 1108951,
        });
      },
    },
    {
      id: 3,
      text: "Buy $BRND",
      action: () => {
        sdk.actions.swapToken({
          sellToken:
            "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          buyToken:
            "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07",
          sellAmount: "1000000",
        });
      },
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        setPrevIndex(prevIndex);
        setIsTransitioning(true);
        return (prevIndex + 1) % linksData.length;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [linksData.length]);

  // Reset transition state after animation completes
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 0); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const currentLink = linksData[currentIndex];

  return (
    <div className={styles.container}>
      <div className={styles.indicators}>
        {linksData.map((_, index) => (
          <div
            key={index}
            className={`${styles.dot} ${
              index === currentIndex ? styles.activeDot : ""
            }`}
          />
        ))}
      </div>

      <div
        onClick={() => {
          currentLink.action();
        }}
        className={styles.linkFrame}
      >
        <div className={styles.linkItem}>
          {isTransitioning && (
            <div key={`prev-${prevIndex}`} className={styles.linkTextExit}>
              <Typography variant="geist" weight="bold" size={16}>
                {linksData[prevIndex].text}
              </Typography>
            </div>
          )}
          <div
            key={`current-${currentIndex}`}
            className={isTransitioning ? styles.linkTextEnter : styles.linkText}
          >
            <Typography variant="geist" weight="bold" size={16}>
              {currentLink.text}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomLinksFrame;
