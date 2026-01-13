// Dependencies
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useNavigate } from "react-router-dom";

// StyleSheet
import styles from "./MyPodium.module.scss";

// Hooks
import { useMyVoteHistory } from "@/hooks/user";
import { usePodiumCollectibles } from "@/shared/hooks/contract/usePodiumCollectibles";
import { useAuth } from "@/shared/hooks/auth";

// Components
import BrandCard from "@/components/cards/BrandCard";
import Typography from "@/components/Typography";
import IndividualPodium from "@/shared/components/IndividualPodium";

// Utils
import { getBrandScoreVariation } from "@/shared/utils/brand";
import LoaderIndicator from "@/shared/components/LoaderIndicator";
import Button from "@/shared/components/Button";

function MyPodium() {
  const navigate = useNavigate();
  const [pageId, setPageId] = useState<number>(1);
  const [processingPodiumId, setProcessingPodiumId] = useState<string | null>(
    null
  );

  const {
    data: history,
    isFetching,
    refetch,
    isLoading,
    error,
  } = useMyVoteHistory(pageId, 15);

  // Get current user's FID
  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  // Podium collectibles hook
  const {
    claimPodium,
    isArrangementMinted,
    isClaimingPodium,
    isApproving,
    isPending,
    isConfirming,
    error: contractError,
    refreshData,
  } = usePodiumCollectibles((txData) => {
    // Claim success callback
    console.log("✅ Podium claimed successfully!", txData);
    setProcessingPodiumId(null);
    refreshData();
    refetch();
  });

  useEffect(() => {
    refetch();
  }, [pageId, refetch]);

  // Clear processing state when transaction completes
  useEffect(() => {
    if (!isPending && !isConfirming && !isApproving && processingPodiumId) {
      const timer = setTimeout(() => {
        if (!isClaimingPodium) {
          setProcessingPodiumId(null);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    isPending,
    isConfirming,
    isApproving,
    isClaimingPodium,
    processingPodiumId,
  ]);

  // Handle claim podium
  const handleClaimPodium = useCallback(
    async (podiumId: string, brandIds: [number, number, number]) => {
      if (!userFid) return;

      try {
        // Check if already minted
        const isMinted = await isArrangementMinted(brandIds);
        if (isMinted) {
          console.log("Podium already minted");
          return;
        }

        setProcessingPodiumId(podiumId);
        await claimPodium(brandIds);
      } catch (error) {
        console.error("Failed to claim podium:", error);
        setProcessingPodiumId(null);
      }
    },
    [userFid, isArrangementMinted, claimPodium]
  );

  /**
   * Handles the scroll event of the list for infinite loading.
   *
   * @param {React.UIEvent<HTMLDivElement>} e - The scroll event.
   */
  const handleScrollList = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const calc = scrollTop + clientHeight + 50;
    if (calc >= scrollHeight && !isFetching && history) {
      const totalItems = Object.keys(history.data).length;
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
  if (history && Object.keys(history.data).length === 0) {
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
            {Object.keys(history.data).map((date, index) => {
              const podiumData = history.data[date];
              return (
                <li
                  key={`--podium-key-${index.toString()}`}
                  className={styles.item}
                >
                  <IndividualPodium
                    brand1={podiumData.brand1}
                    brand2={podiumData.brand2}
                    brand3={podiumData.brand3}
                    creator="@jpfraneto"
                    owner="@esdotge"
                    price="10000 $BRND"
                    onBuyClick={() => {
                      const brandIds: [number, number, number] = [
                        podiumData.brand1.id,
                        podiumData.brand2.id,
                        podiumData.brand3.id,
                      ];
                      handleClaimPodium(podiumData.id, brandIds);
                    }}
                  />
                </li>
              );
            })}
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
