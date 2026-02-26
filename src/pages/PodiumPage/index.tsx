import React, { useEffect, useState } from "react";

// StyleSheet
import styles from "./PodiumPage.module.scss";

// Components
import AppLayout from "../../shared/layouts/AppLayout";
import PublicPodiumsFeed from "./partials/PublicPodiumsFeed";

// Hocs
import withProtectionRoute from "@/hocs/withProtectionRoute";
import BrandHeader from "@/shared/components/BrandHeader";
import Typography from "@/shared/components/Typography";
import { motion } from "framer-motion";

function PodiumPage(): React.ReactNode {
  const [indicatorWidth, setIndicatorWidth] = useState<number>(0);
  const [indicatorOffset, setIndicatorOffset] = useState<number>(0);

  const updateIndicator = () => {
    const activeTab = document.querySelector<HTMLDivElement>(
      `.${styles.tab}.${styles.active}`
    );
    if (activeTab) {
      setIndicatorWidth(activeTab.clientWidth);
      setIndicatorOffset(activeTab.offsetLeft);
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);

    return () => {
      window.removeEventListener("resize", updateIndicator);
    };
  }, []);
  return (
    <AppLayout>
      <div className={styles.body}>
        <div className={styles.header}>
          <BrandHeader showBackButton={false} />
          <div className={styles.titleContainer}>
            <Typography variant={"druk"} weight={"wide"}>
              PODIUMS
            </Typography>
          </div>

          <motion.div
            className={styles.indicator}
            initial={{ x: 0, width: 0 }}
            animate={{ x: indicatorOffset, width: indicatorWidth }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          <div className={styles.description}>
            <Typography
              variant="geist"
              weight="regular"
              size={15}
              textAlign="left"
              lineHeight={20}
            >
              Discover the latest podiums and connect with their creators.
            </Typography>
          </div>
        </div>
        <PublicPodiumsFeed />
      </div>
    </AppLayout>
  );
}

export default withProtectionRoute(PodiumPage, "only-connected");
