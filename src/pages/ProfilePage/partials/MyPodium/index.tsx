// Dependencies
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useNavigate } from "react-router-dom";

// StyleSheet
import styles from "./MyPodium.module.scss";

// Hooks
import { useMyVoteHistory } from "@/hooks/user"; // Updated import - no longer need useAuth
// Removed: import { useAuth } from '@/hooks/auth';

// Components
import BrandCard from "@/components/cards/BrandCard";
import Typography from "@/components/Typography";

// Utils
import { getBrandScoreVariation } from "@/shared/utils/brand";
import LoaderIndicator from "@/shared/components/LoaderIndicator";
import Button from "@/shared/components/Button";

function MyPodium() {
  const navigate = useNavigate();
  const [pageId, setPageId] = useState<number>(1);

  const {
    data: history,
    isFetching,
    refetch,
    isLoading,
    error,
  } = useMyVoteHistory(pageId, 15);

  useEffect(() => {
    refetch();
  }, [pageId, refetch]);

  /**
   * Handles the scroll event of the list for infinite loading.
   *
   * @param {React.UIEvent<HTMLDivElement>} e - The scroll event.
   */
  const handleScrollList = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const calc = scrollTop + clientHeight + 50;
    if (calc >= scrollHeight && !isFetching && history) {
      const totalItems = history.data.length;
      if (totalItems < history.count) {
        setPageId((prev) => prev + 1);
      }
    }
  };

  // Loading state for initial load
  if (isLoading && pageId === 1) {
    return (
      <div className={styles.layout}>
        <div className={styles.loading}>
          <Typography>
            <LoaderIndicator />
          </Typography>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.layout}>
        <div className={styles.error}>
          <Typography size={14} weight="medium">
            Failed to load your podiums
          </Typography>

          <Button
            caption="Try Again"
            variant="primary"
            onClick={() => refetch()}
          />
        </div>
      </div>
    );
  }

  // Empty state - no podiums yet
  if (history && history.data.length === 0) {
    return (
      <div className={styles.emptyLayout}>
        <div className={styles.empty}>
          <Typography size={16} weight={"regular"} lineHeight={20}>
            Nothing here yet
          </Typography>
          <Typography size={16} weight={"regular"} lineHeight={20}>
            Start voting to see your personal brand rankings!
          </Typography>
          <div className={styles.center}>
            <Button
              caption="Vote Now"
              variant="primary"
              onClick={() => navigate("/vote")}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {history && (
        <div className={styles.view} onScroll={handleScrollList}>
          <ul className={styles.list}>
            {history.data.map((vote, _) => (
              <li key={`--podium-key-${vote.id}`} className={styles.item}>
                <div className={styles.brands}>
                  <BrandCard
                    key={"--podium-key-1"}
                    score={vote.brand1.score}
                    variation={getBrandScoreVariation(vote.brand1.stateScore)}
                    name={vote.brand1.name}
                    photoUrl={vote.brand1.imageUrl}
                    onClick={() => navigate(`/brand/${vote.brand1.id}`)}
                  />
                  <BrandCard
                    key={"--podium-key-2"}
                    score={vote.brand2.score}
                    variation={getBrandScoreVariation(vote.brand2.stateScore)}
                    name={vote.brand2.name}
                    photoUrl={vote.brand2.imageUrl}
                    onClick={() => navigate(`/brand/${vote.brand2.id}`)}
                  />
                  <BrandCard
                    key={"--podium-key-3"}
                    score={vote.brand3.score}
                    variation={getBrandScoreVariation(vote.brand3.stateScore)}
                    name={vote.brand3.name}
                    photoUrl={vote.brand3.imageUrl}
                    onClick={() => navigate(`/brand/${vote.brand3.id}`)}
                  />
                </div>
                <div className={styles.data}>
                  <Typography
                    variant={"geist"}
                    size={14}
                    lineHeight={14}
                    weight={"medium"}
                  >
                    {formatDistanceToNow(new Date(vote.date).getTime(), {
                      addSuffix: true,
                    }).includes("hour")
                      ? "today"
                      : formatDistanceToNow(new Date(vote.date).getTime(), {
                          addSuffix: true,
                        })}
                  </Typography>
                </div>
              </li>
            ))}
          </ul>

          {/* Loading indicator for pagination */}
          {isFetching && pageId > 1 && (
            <div className={styles.loadingMore}>
              <Typography size={12} className={styles.loadingText}>
                Loading more podiums...
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyPodium;
