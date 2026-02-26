import styles from "./PodiumCarouselGSAP.module.scss";
import type { LivePodium } from "./livePodiums.types";

interface PodiumCardProps {
  podium: LivePodium;
  priority?: boolean;
}

export function PodiumCard({ podium, priority = false }: PodiumCardProps) {
  const username = (podium.username || "").trim() || "user";
  const userInitial = username.charAt(0).toUpperCase();
  const brand1Name = (podium.brand1?.name || "").trim() || "Brand";
  const brand2Name = (podium.brand2?.name || "").trim() || "Brand";
  const brand3Name = (podium.brand3?.name || "").trim() || "Brand";

  const dateValue = new Date(podium.date);
  const displayDate = Number.isNaN(dateValue.getTime())
    ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : dateValue.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div
      className={`podium-card ${styles.podiumCard}`}
      role="region"
      aria-label={`Brand ranking podium by @${username}`}
      tabIndex={0}
    >
      <div className={styles.cardHeader}>
        <div className={styles.userInfo}>
          {podium.userPhoto ? (
            <img
              src={podium.userPhoto}
              width={40}
              height={40}
              alt={username}
              className={styles.userPhoto}
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className={styles.userPlaceholder}>{userInitial}</div>
          )}
          <span className={styles.username}>@{username}</span>
        </div>
        <span className={styles.date}>{displayDate}</span>
      </div>

      <div className={styles.podiumVisual}>
        {podium.brand2 && (
          <div className={styles.podiumColumn}>
            <div className={`${styles.podiumBase} ${styles.podium2nd} ${styles.podiumGradient}`}>
              <div className={styles.podiumInner}>
                <div className={`${styles.brandImageContainer} ${styles.brandImageContainer2nd}`}>
                  {podium.brand2.imageUrl ? (
                    <img
                      src={podium.brand2.imageUrl}
                      width={100}
                      height={100}
                      alt={`${brand2Name} brand logo in 2nd place`}
                      className={styles.brandImage}
                      loading={priority ? "eager" : "lazy"}
                    />
                  ) : (
                    <div className={styles.brandPlaceholder}>{brand2Name.charAt(0)}</div>
                  )}
                </div>
                <span className={`${styles.rankNumber} ${styles.rankNumber2nd}`}>2</span>
                <span className={`${styles.brandName} ${styles.brandName2nd}`}>{brand2Name}</span>
              </div>
            </div>
          </div>
        )}

        {podium.brand1 && (
          <div className={styles.podiumColumn}>
            <div className={`${styles.podiumBase} ${styles.podium1st} ${styles.podiumGradient}`}>
              <div className={styles.podiumInner}>
                <div className={`${styles.brandImageContainer} ${styles.brandImageContainer1st}`}>
                  {podium.brand1.imageUrl ? (
                    <img
                      src={podium.brand1.imageUrl}
                      width={100}
                      height={100}
                      alt={`${brand1Name} brand logo in 1st place`}
                      className={styles.brandImage}
                      loading={priority ? "eager" : "lazy"}
                    />
                  ) : (
                    <div className={styles.brandPlaceholder}>{brand1Name.charAt(0)}</div>
                  )}
                </div>
                <span className={`${styles.rankNumber} ${styles.rankNumber1st}`}>1</span>
                <span className={`${styles.brandName} ${styles.brandName1st}`}>{brand1Name}</span>
              </div>
            </div>
          </div>
        )}

        {podium.brand3 && (
          <div className={styles.podiumColumn}>
            <div className={`${styles.podiumBase} ${styles.podium3rd} ${styles.podiumGradient}`}>
              <div className={styles.podiumInner}>
                <div className={`${styles.brandImageContainer} ${styles.brandImageContainer3rd}`}>
                  {podium.brand3.imageUrl ? (
                    <img
                      src={podium.brand3.imageUrl}
                      width={100}
                      height={100}
                      alt={`${brand3Name} brand logo in 3rd place`}
                      className={styles.brandImage}
                      loading={priority ? "eager" : "lazy"}
                    />
                  ) : (
                    <div className={styles.brandPlaceholder}>{brand3Name.charAt(0)}</div>
                  )}
                </div>
                <span className={`${styles.rankNumber} ${styles.rankNumber3rd}`}>3</span>
                <span className={`${styles.brandName} ${styles.brandName3rd}`}>{brand3Name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
