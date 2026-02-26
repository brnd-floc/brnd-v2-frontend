import { useRef } from "react";
import { PodiumCard } from "./PodiumCard";
import styles from "./PodiumCarouselGSAP.module.scss";
import { useLivePodiumsData } from "./useLivePodiumsData";
import { usePodiumStackAnimation } from "./usePodiumStackAnimation";
import type { LivePodium } from "./livePodiums.types";

const VISIBLE_CARDS = 4;

interface PodiumCarouselProps {
  initialPodiums?: LivePodium[];
}

export function PodiumCarouselGSAP({ initialPodiums = [] }: PodiumCarouselProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const { podiums, isLoading } = useLivePodiumsData({ initialPodiums });

  usePodiumStackAnimation({
    sliderRef,
    itemCount: podiums.length,
  });

  if (isLoading) {
    return (
      <section className={styles.loadingSection}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
        </div>
      </section>
    );
  }

  if (podiums.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>Live Podiums</h2>

        <div ref={sliderRef} className={styles.sliderContainer}>
          <div className={styles.gradientTop} />
          <div className={styles.gradientBottom} />
          {podiums.slice(0, VISIBLE_CARDS).map((podium, index, array) => (
            <PodiumCard
              key={podium.id || `podium-${index}`}
              podium={podium}
              priority={index === array.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
