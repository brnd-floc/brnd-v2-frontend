import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import sdk from "@farcaster/miniapp-sdk";
import styles from "./MyPodium.module.scss";
import { useMyVoteHistory } from "@/hooks/user";
import { usePodiumCollectibles } from "@/shared/hooks/contract/usePodiumCollectibles";
import { useAuth } from "@/shared/hooks/auth";
import Typography from "@/components/Typography";
import IndividualPodium from "@/shared/components/IndividualPodium";
import LoaderIndicator from "@/shared/components/LoaderIndicator";
import Button from "@/shared/components/Button";
import { CollectibleData, VoteHistoryItem } from "@/shared/types/collectibles";
import { UserVoteHistory } from "@/shared/hooks/user/types";

function MyPodium() {
  const navigate = useNavigate();
  const [pageId, setPageId] = useState<number>(1);
  const [processingPodiumId, setProcessingPodiumId] = useState<string | null>(
    null
  );
  // Track optimistic updates for successful transactions
  const [successfulPodiums, setSuccessfulPodiums] = useState<Set<string>>(
    new Set()
  );

  const {
    data: history,
    isFetching,
    refetch,
    isLoading,
    error,
  } = useMyVoteHistory(pageId, 15);
  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  const {
    claimPodium,
    buyPodium,
    isClaimingPodium,
    isBuyingPodium,
    isApproving,
    isPending,
    isConfirming,
    refreshData,
  } = usePodiumCollectibles(
    (txData) => {
      console.log("✅ Podium claimed!", txData);
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
      console.log("✅ Podium bought!", txData);
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

  useEffect(() => {
    refetch();
  }, [pageId, refetch]);

  useEffect(() => {
    if (!isPending && !isConfirming && !isApproving && processingPodiumId) {
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
    if (history && successfulPodiums.size > 0) {
      const updatedSuccessful = new Set(successfulPodiums);
      let hasChanges = false;

      successfulPodiums.forEach((podiumId) => {
        const vote = Object.values(history.data).find(
          (v: UserVoteHistory) => v.id === podiumId
        );
        // If the real data now shows it's a collectible, remove from optimistic set
        if (vote && (vote as any).isCollectible) {
          updatedSuccessful.delete(podiumId);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSuccessfulPodiums(updatedSuccessful);
      }
    }
  }, [history, successfulPodiums]);

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

  const handleScrollList = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const calc = scrollTop + clientHeight + 50;
    if (calc >= scrollHeight && !isFetching && history) {
      setPageId((prev) => prev + 1);
    }
  };

  // Transform vote to collectible data
  // Note: UserVoteHistory may have collectible fields at runtime even though they're not in the type
  const toCollectibleData = (
    vote: UserVoteHistory & {
      isCollectible?: boolean;
      collectibleTokenId?: number | null;
      collectiblePrice?: string | null;
      collectibleClaimCount?: number;
      collectibleGenesisCreatorFid?: number | null;
      collectibleGenesisCreatorUsername?: string | null;
      collectibleOwnerFid?: number | null;
      collectibleOwnerUsername?: string | null;
      collectibleTotalFeesEarned?: string;
    }
  ): CollectibleData => ({
    isCollectible: (vote as any).isCollectible ?? false,
    tokenId: (vote as any).collectibleTokenId ?? null,
    price: (vote as any).collectiblePrice || "1000000000000000000000000", // 1M BRND default
    claimCount: (vote as any).collectibleClaimCount ?? 0,
    genesisCreatorFid: (vote as any).collectibleGenesisCreatorFid ?? null,
    genesisCreatorUsername:
      (vote as any).collectibleGenesisCreatorUsername ?? null,
    ownerFid: (vote as any).collectibleOwnerFid ?? null,
    ownerUsername: (vote as any).collectibleOwnerUsername ?? null,
    totalFeesEarned: (vote as any).collectibleTotalFeesEarned ?? "0",
  });

  if (isLoading && pageId === 1) {
    return (
      <div className={styles.layout}>
        <div className={styles.loading}>
          <LoaderIndicator />
        </div>
      </div>
    );
  }

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

  if (history && Object.keys(history.data).length === 0) {
    return (
      <div className={styles.emptyLayout}>
        <div className={styles.empty}>
          <Typography size={16} weight="regular" lineHeight={20}>
            Nothing here yet
          </Typography>
          <Typography size={16} weight="regular" lineHeight={20}>
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
            {Object.values(history.data).map((vote: UserVoteHistory) => {
              const collectibleData = toCollectibleData(vote);
              const brandIds: [number, number, number] = [
                vote.brand1.id,
                vote.brand2.id,
                vote.brand3.id,
              ];
              const isProcessing = processingPodiumId === vote.id;
              const collectibleTokenId = (vote as any).collectibleTokenId;

              // Apply optimistic update if this podium was successfully transacted
              const hasSucceeded = successfulPodiums.has(vote.id);
              const optimisticCollectibleData = hasSucceeded
                ? { ...collectibleData, isCollectible: true }
                : collectibleData;

              return (
                <li key={vote.id} className={styles.item}>
                  <IndividualPodium
                    brand1={vote.brand1}
                    brand2={vote.brand2}
                    brand3={vote.brand3}
                    collectibleData={optimisticCollectibleData}
                    onMintClick={() => handleMintPodium(vote.id, brandIds)}
                    onBuyClick={() => {
                      if (collectibleTokenId) {
                        handleBuyPodium(vote.id, collectibleTokenId);
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

          {isFetching && pageId > 1 && (
            <div className={styles.loadingMore}>
              <Typography size={12} className={styles.loadingText}>
                Loading more...
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyPodium;
