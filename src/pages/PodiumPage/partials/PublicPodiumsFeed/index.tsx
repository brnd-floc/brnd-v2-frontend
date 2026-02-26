import { useState, useEffect, useCallback } from 'react';

// Components
import Typography from '@/components/Typography';
import FeedIndividualPodium from '@/shared/components/FeedIndividualPodium';
import LoaderIndicator from '@/shared/components/LoaderIndicator';

// StyleSheet
import styles from './PublicPodiumsFeed.module.scss';

// Hooks
import { useRecentPodiums } from '@/hooks/brands';
import { usePodiumCollectibles } from '@/shared/hooks/contract/usePodiumCollectibles';
import { useAuth } from '@/shared/hooks/auth';
import { useModal } from '@/shared/hooks/ui/useModal';
import { ModalsIds } from '@/shared/providers/ModalProvider/types';

// Utils
import { sdk } from '@farcaster/miniapp-sdk';

// Types
import { CollectibleData } from '@/shared/types/collectibles';
import { MintingStep } from '@/shared/components/IndividualPodium';

function PublicPodiumsFeed() {
  const { openModal } = useModal();
  const [currentPage, setCurrentPage] = useState(1);
  const [allPodiums, setAllPodiums] = useState<any[]>([]); // Accumulate all podiums
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization
  const [processingPodiumId, setProcessingPodiumId] = useState<string | null>(
    null,
  );
  // Track optimistic updates for successful transactions with their type
  const [successfulPodiums, setSuccessfulPodiums] = useState<
    Map<string, 'mint' | 'buy'>
  >(new Map());
  const limit = 20;

  const { data, isLoading, isFetching, error, refetch } = useRecentPodiums(
    currentPage,
    limit,
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
    isFetchingSignature,
    error: contractError,
    refreshData,
  } = usePodiumCollectibles(
    (txData) => {
      // Claim success callback
      console.log('✅ Podium claimed successfully!', txData);
      // Provide haptic feedback for success
      sdk.haptics.notificationOccurred('success');
      // Optimistically mark this podium as minted
      if (processingPodiumId) {
        setSuccessfulPodiums((prev) =>
          new Map(prev).set(processingPodiumId, 'mint'),
        );
      }
      setProcessingPodiumId(null);
      refreshData();
      // Don't refetch immediately - optimistic update handles the UI
    },
    (txData) => {
      // Buy success callback
      console.log('✅ Podium bought successfully!', txData);
      // Provide haptic feedback for success
      sdk.haptics.notificationOccurred('success');
      // Optimistically mark this podium as bought
      if (processingPodiumId) {
        setSuccessfulPodiums((prev) =>
          new Map(prev).set(processingPodiumId, 'buy'),
        );
      }
      setProcessingPodiumId(null);
      refreshData();
      // Don't refetch immediately - optimistic update handles the UI
    },
  );

  // Clear processing state when transaction completes (success or error)
  useEffect(() => {
    // Don't clear if any transaction-related activity is in progress
    if (
      !isPending &&
      !isConfirming &&
      !isApproving &&
      !isFetchingSignature &&
      processingPodiumId
    ) {
      // Small delay to allow success callbacks to run first
      const timer = setTimeout(() => {
        if (!isClaimingPodium && !isBuyingPodium && !isFetchingSignature) {
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
    isFetchingSignature,
    processingPodiumId,
  ]);

  // Calculate current minting step based on hook states
  const getCurrentMintingStep = (): MintingStep => {
    if (isFetchingSignature) return 'fetching_signature';
    if (isApproving && !isConfirming) return 'approving';
    if (isApproving && isConfirming) return 'confirming_approval';
    if (isClaimingPodium && !isConfirming) return 'minting';
    if (isBuyingPodium && !isConfirming) return 'buying';
    if (isConfirming) return 'confirming';
    return null;
  };

  const currentMintingStep = getCurrentMintingStep();

  // Show error modal when contract error occurs
  useEffect(() => {
    if (contractError) {
      sdk.haptics.notificationOccurred('error');
      openModal(ModalsIds.TRANSACTION_ERROR, {
        error: contractError,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
        transactionType: 'Podium Transaction (Feed)',
      });
      setProcessingPodiumId(null);
    }
  }, [contractError, openModal]);

  // Clear optimistic updates once real data confirms the change
  useEffect(() => {
    if (data?.data && successfulPodiums.size > 0) {
      const updatedSuccessful = new Map(successfulPodiums);
      let hasChanges = false;

      successfulPodiums.forEach((successType, podiumId) => {
        const podium = allPodiums.find((p) => p.id === podiumId);
        if (!podium) return;

        // For mint: clear when isCollectible becomes true
        // For buy: clear when the owner matches the current user
        const shouldClear =
          successType === 'mint'
            ? podium.isCollectible
            : podium.collectibleOwnerFid === userFid;

        if (shouldClear) {
          updatedSuccessful.delete(podiumId);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSuccessfulPodiums(updatedSuccessful);
      }
    }
  }, [data, allPodiums, successfulPodiums, userFid]);

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
    [isFetching, isLoadingMore, data, allPodiums.length, currentPage],
  );

  // Helper functions for handling mint and buy actions
  const handleMintPodium = useCallback(
    async (podiumId: string, brandIds: [number, number, number]) => {
      if (!userFid) return;
      try {
        setProcessingPodiumId(podiumId);
        await claimPodium(brandIds);
      } catch (error) {
        console.error('Failed to mint podium:', error);
        setProcessingPodiumId(null);
      }
    },
    [userFid, claimPodium],
  );

  const handleBuyPodium = useCallback(
    async (podiumId: string, tokenId: number) => {
      if (!userFid) return;
      try {
        setProcessingPodiumId(podiumId);
        await buyPodium(tokenId);
      } catch (error) {
        console.error('Failed to buy podium:', error);
        setProcessingPodiumId(null);
      }
    },
    [userFid, buyPodium],
  );

  // Transform podium data to CollectibleData format
  const toCollectibleData = useCallback((podium: any): CollectibleData => {
    return {
      isCollectible: podium.isCollectible ?? false,
      tokenId: podium.collectibleTokenId ?? null,
      price: podium.collectiblePrice || '1000000000000000000000000', // 1M BRND default
      claimCount: podium.collectibleClaimCount ?? 0,
      genesisCreatorFid: podium.collectibleGenesisCreatorFid ?? null,
      genesisCreatorUsername: podium.collectibleGenesisCreatorUsername ?? null,
      ownerFid: podium.collectibleOwnerFid ?? null,
      ownerUsername: podium.collectibleOwnerUsername ?? null,
      ownerPhotoUrl: podium.collectibleOwner?.photoUrl ?? null,
      totalFeesEarned: podium.collectibleTotalFeesEarned ?? '0',
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
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Check if we have data to show
  const hasData = allPodiums.length > 0;

  // Show loading only if we're loading the first page and haven't initialized
  if (isLoading && !isInitialized) {
    return (
      <div className={styles.layout}>
        <LoaderIndicator size={30} variant={'fullscreen'} />
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
            const successType = successfulPodiums.get(podium.id);
            const hasSucceeded = !!successType;

            // Build optimistic collectible data based on success type
            let optimisticCollectibleData = collectibleData;
            if (hasSucceeded) {
              optimisticCollectibleData = {
                ...collectibleData,
                isCollectible: true,
                // For both mint and buy success, update owner to current user
                ownerFid: userFid,
                ownerUsername: authData?.username || null,
                ownerPhotoUrl: authData?.photoUrl || null,
              };
            }

            return (
              <li key={podium.id} className={styles.item}>
                <FeedIndividualPodium
                  user={podium.user}
                  brand1={podium.brand1}
                  brand2={podium.brand2}
                  brand3={podium.brand3}
                  podium={podium}
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
                  onMintSuccess={() => {
                    refreshData();
                    refetch();
                  }}
                  isPending={
                    isProcessing &&
                    (isPending ||
                      isConfirming ||
                      isApproving ||
                      isFetchingSignature)
                  }
                  mintingStep={isProcessing ? currentMintingStep : null}
                  hasSucceeded={hasSucceeded}
                  successType={successType}
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
