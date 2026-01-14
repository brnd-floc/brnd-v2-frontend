import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Components
import Typography from "@/components/Typography";
import IndividualPodium from "@/shared/components/IndividualPodium";
import LoaderIndicator from "@/shared/components/LoaderIndicator";

// StyleSheet
import styles from "./PublicPodiumsFeed.module.scss";

// Hooks
import { useRecentPodiums } from "@/hooks/brands";
import { usePodiumCollectibles } from "@/shared/hooks/contract/usePodiumCollectibles";
import { useAuth } from "@/shared/hooks/auth";

// Utils
import { sdk } from "@farcaster/miniapp-sdk";

// Types
import { CollectibleData } from "@/shared/types/collectibles";

function PublicPodiumsFeed() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [allPodiums, setAllPodiums] = useState<any[]>([]); // Accumulate all podiums
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization
  const [processingPodiumId, setProcessingPodiumId] = useState<string | null>(
    null
  );
  // Track optimistic updates for successful transactions
  const [successfulPodiums, setSuccessfulPodiums] = useState<Set<string>>(
    new Set()
  );
  const limit = 20;

  const { data, isLoading, isFetching, error, refetch } = useRecentPodiums(
    currentPage,
    limit
  );

  // Get current user's FID for filtering
  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  // Podium collectibles hook
  const {
    claimPodium,
    buyPodium,
    isClaimingPodium,
    isBuyingPodium,
    isApproving,
    isPending,
    isConfirming,
    error: contractError,
    refreshData,
  } = usePodiumCollectibles(
    (txData) => {
      // Claim success callback
      console.log("✅ Podium claimed successfully!", txData);
      // Provide haptic feedback for success
      sdk.haptics.notificationOccurred("success");
      // Optimistically mark this podium as successful
      if (processingPodiumId) {
        setSuccessfulPodiums((prev) => new Set(prev).add(processingPodiumId));
      }
      setProcessingPodiumId(null);
      refreshData();
      refetch();
    },
    (txData) => {
      // Buy success callback
      console.log("✅ Podium bought successfully!", txData);
      // Provide haptic feedback for success
      sdk.haptics.notificationOccurred("success");
      // Optimistically mark this podium as successful
      if (processingPodiumId) {
        setSuccessfulPodiums((prev) => new Set(prev).add(processingPodiumId));
      }
      setProcessingPodiumId(null);
      refreshData();
      refetch();
    }
  );

  // Clear processing state when transaction completes (success or error)
  useEffect(() => {
    if (!isPending && !isConfirming && !isApproving && processingPodiumId) {
      // Small delay to allow success callbacks to run first
      const timer = setTimeout(() => {
        if (!isClaimingPodium && !isBuyingPodium) {
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
    isBuyingPodium,
    processingPodiumId,
  ]);

  // Clear optimistic updates once real data confirms the change
  useEffect(() => {
    if (data?.data && successfulPodiums.size > 0) {
      const updatedSuccessful = new Set(successfulPodiums);
      let hasChanges = false;

      successfulPodiums.forEach((podiumId) => {
        const podium = allPodiums.find((p) => p.id === podiumId);
        // If the real data now shows it's minted (isCollectible true), remove from optimistic set
        if (podium && podium.isCollectible) {
          updatedSuccessful.delete(podiumId);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSuccessfulPodiums(updatedSuccessful);
      }
    }
  }, [data, allPodiums, successfulPodiums]);

  /**
   * Initialize component with first page data on mount
   */
  useEffect(() => {
    if (data?.data && !isInitialized) {
      setAllPodiums(data.data);
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  /**
   * Accumulate podiums from subsequent pages
   */
  useEffect(() => {
    if (data?.data && isInitialized) {
      if (currentPage === 1) {
        // First page after initialization - replace all podiums
        setAllPodiums(data.data);
      } else {
        // Subsequent pages - append new podiums
        setAllPodiums((prev) => {
          // Filter out duplicates by id (transactionHash)
          const existingIds = new Set(prev.map((p) => p.id));
          const newPodiums = data.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPodiums];
        });
      }
      setIsLoadingMore(false);
    }
  }, [data, currentPage, isInitialized]);

  /**
   * Handles the scroll event for automatic loading.
   * When user scrolls near the bottom, loads the next page automatically.
   */
  const handleScrollList = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const calc = scrollTop + clientHeight + 50; // 50px buffer before bottom

      // Calculate hasNextPage: if we have loaded fewer items than total count
      const hasNextPage = data ? allPodiums.length < data.count : false;

      if (
        calc >= scrollHeight &&
        !isFetching &&
        !isLoadingMore &&
        hasNextPage
      ) {
        setIsLoadingMore(true);
        setCurrentPage((prev) => prev + 1);
      }
    },
    [isFetching, isLoadingMore, data, allPodiums.length, currentPage]
  );

  // Helper functions for handling mint and buy actions
  const handleMintPodium = useCallback(
    async (podiumId: string, brandIds: [number, number, number]) => {
      if (!userFid) return;
      try {
        setProcessingPodiumId(podiumId);
        await claimPodium(brandIds);
      } catch (error) {
        console.error("Failed to mint podium:", error);
        setProcessingPodiumId(null);
      }
    },
    [userFid, claimPodium]
  );

  const handleBuyPodium = useCallback(
    async (podiumId: string, tokenId: number) => {
      if (!userFid) return;
      try {
        setProcessingPodiumId(podiumId);
        await buyPodium(tokenId);
      } catch (error) {
        console.error("Failed to buy podium:", error);
        setProcessingPodiumId(null);
      }
    },
    [userFid, buyPodium]
  );

  // Transform podium data to CollectibleData format
  const toCollectibleData = useCallback((podium: any): CollectibleData => {
    return {
      isCollectible: podium.isCollectible ?? false,
      tokenId: podium.collectibleTokenId ?? null,
      price: podium.collectiblePrice || "1000000000000000000000000", // 1M BRND default
      claimCount: podium.collectibleClaimCount ?? 0,
      genesisCreatorFid: podium.collectibleGenesisCreatorFid ?? null,
      genesisCreatorUsername: podium.collectibleGenesisCreatorUsername ?? null,
      ownerFid: podium.collectibleOwnerFid ?? null,
      ownerUsername: podium.collectibleOwnerUsername ?? null,
      totalFeesEarned: podium.collectibleTotalFeesEarned ?? "0",
    };
  }, []);

  useEffect(() => {
    if (!data?.data) {
      setCurrentPage(1);
      setAllPodiums([]);
      setIsInitialized(false);
    }
    setIsLoadingMore(false);
  }, [data?.data]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Check if we have data to show
  const hasData = allPodiums.length > 0;

  // Show loading only if we're loading the first page and haven't initialized
  if (isLoading && !isInitialized) {
    return (
      <div className={styles.layout}>
        <LoaderIndicator size={30} variant={"fullscreen"} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.layout}>
        <div className={styles.error}>
          <Typography>Failed to load podiums</Typography>
          <button
            onClick={() => {
              setCurrentPage(1);
              setAllPodiums([]);
              setIsInitialized(false);
              refetch();
            }}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Only show empty state if we have no data AND we've finished loading the first time
  if (!hasData && !isLoading && isInitialized) {
    return (
      <div className={styles.layout}>
        <div className={styles.empty}>
          <Typography>No podiums yet!</Typography>
          <Typography size={14} className={styles.emptySubtext}>
            Be the first to vote and create a podium.
          </Typography>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.layout}>
      <div className={styles.view} onScroll={handleScrollList}>
        <ul className={styles.list}>
          {allPodiums.map((podium) => {
            const collectibleData = toCollectibleData(podium);
            const brandIds: [number, number, number] = [
              podium.brand1?.id || 0,
              podium.brand2?.id || 0,
              podium.brand3?.id || 0,
            ];
            const isProcessing = processingPodiumId === podium.id;
            const collectibleTokenId = podium.collectibleTokenId;
            const isLastVoteForCombination =
              podium.isLastVoteForCombination ?? false;

            // Apply optimistic update if this podium was successfully transacted
            const hasSucceeded = successfulPodiums.has(podium.id);
            const optimisticCollectibleData = hasSucceeded
              ? { ...collectibleData, isCollectible: true }
              : collectibleData;

            return (
              <li key={podium.id} className={styles.item}>
                <IndividualPodium
                  user={podium.user}
                  brand1={podium.brand1}
                  brand2={podium.brand2}
                  brand3={podium.brand3}
                  collectibleData={optimisticCollectibleData}
                  isLastVoteForCombination={
                    hasSucceeded ? true : isLastVoteForCombination
                  }
                  onMintClick={() => handleMintPodium(podium.id, brandIds)}
                  onBuyClick={() => {
                    if (collectibleTokenId) {
                      handleBuyPodium(podium.id, collectibleTokenId);
                    }
                  }}
                  isPending={
                    isProcessing && (isPending || isConfirming || isApproving)
                  }
                />
              </li>
            );
          })}
        </ul>

        {(isFetching || isLoadingMore) && currentPage > 1 && (
          <div className={styles.loadingMore}>
            <Typography size={12} className={styles.loadingText}>
              Loading more...
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicPodiumsFeed;
