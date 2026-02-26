import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import sdk from '@farcaster/miniapp-sdk';
import styles from './MyPodium.module.scss';
import { useMyVoteHistory } from '@/hooks/user';
import { usePodiumCollectibles } from '@/shared/hooks/contract/usePodiumCollectibles';
import { useAuth } from '@/shared/hooks/auth';
import { useModal } from '@/shared/hooks/ui/useModal';
import { ModalsIds } from '@/shared/providers/ModalProvider/types';
import Typography from '@/components/Typography';
import IndividualPodium, {
  MintingStep,
  IndividualPodiumProps,
} from '@/shared/components/IndividualPodium';
import LoaderIndicator from '@/shared/components/LoaderIndicator';
import Button from '@/shared/components/Button';
import { CollectibleData } from '@/shared/types/collectibles';
import { User, UserVoteHistory } from '@/shared/hooks/user/types';

type VoteHistoryWithCollectibles = UserVoteHistory & {
  isCollectible?: boolean;
  isLastVoteForCombination?: boolean;
  collectibleTokenId?: number | null;
  collectiblePrice?: string | null;
  collectibleClaimCount?: number;
  collectibleGenesisCreatorFid?: number | null;
  collectibleGenesisCreatorUsername?: string | null;
  collectibleOwnerFid?: number | null;
  collectibleOwnerUsername?: string | null;
  collectibleOwner?: Partial<User> | null;
  collectibleTotalFeesEarned?: string;
  user?: Partial<User> | null;
};

function MyPodium() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [pageId, setPageId] = useState<number>(1);
  const [processingPodiumId, setProcessingPodiumId] = useState<string | null>(
    null
  );
  // Track optimistic updates for successful transactions
  const [successfulPodiums, setSuccessfulPodiums] = useState<Map<string, 'mint' | 'buy'>>(
    new Map()
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
    isFetchingSignature,
    error: contractError,
    refreshData,
  } = usePodiumCollectibles(
    (txData) => {
      console.log('✅ Podium claimed!', txData);
      // Provide haptic feedback for success
      sdk.haptics.notificationOccurred('success');
      // Optimistically mark this podium as successful with type
      if (processingPodiumId) {
        setSuccessfulPodiums((prev) => new Map(prev).set(processingPodiumId, 'mint'));
      }
      setProcessingPodiumId(null);
      refreshData();
      // Don't refetch immediately - optimistic update handles the UI
      // List will sync when user navigates away and back
    },
    (txData) => {
      console.log('✅ Podium bought!', txData);
      // Provide haptic feedback for success
      sdk.haptics.notificationOccurred('success');
      // Optimistically mark this podium as successful with type
      if (processingPodiumId) {
        setSuccessfulPodiums((prev) => new Map(prev).set(processingPodiumId, 'buy'));
      }
      setProcessingPodiumId(null);
      refreshData();
      // Don't refetch immediately - optimistic update handles the UI
      // List will sync when user navigates away and back
    }
  );

  useEffect(() => {
    refetch();
  }, [pageId, refetch]);

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

  useEffect(() => {
    if (!isPending && !isConfirming && !isApproving && !isFetchingSignature && processingPodiumId) {
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
    isFetchingSignature,
    isClaimingPodium,
    isBuyingPodium,
    processingPodiumId,
  ]);

  // Show error modal when contract error occurs
  useEffect(() => {
    if (contractError) {
      sdk.haptics.notificationOccurred('error');
      openModal(ModalsIds.TRANSACTION_ERROR, {
        error: contractError,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
        transactionType: 'Podium Transaction (MyPodium)',
      });
      setProcessingPodiumId(null);
    }
  }, [contractError, openModal]);

  // Clear optimistic updates once real data confirms the change
  useEffect(() => {
    if (history && successfulPodiums.size > 0) {
      const updatedSuccessful = new Map(successfulPodiums);
      let hasChanges = false;

      successfulPodiums.forEach((_, podiumId) => {
        const vote = (Object.values(history.data) as VoteHistoryWithCollectibles[]).find(
          (v) => v.id === podiumId
        );
        // If the real data now shows it's a collectible, remove from optimistic map
        if (vote?.isCollectible) {
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
        console.error('Failed to mint podium:', error);
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
        console.error('Failed to buy podium:', error);
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
  const toCollectibleData = (vote: VoteHistoryWithCollectibles): CollectibleData => ({
    isCollectible: vote.isCollectible ?? false,
    tokenId: vote.collectibleTokenId ?? null,
    price: vote.collectiblePrice || '1000000000000000000000000', // 1M BRND default
    claimCount: vote.collectibleClaimCount ?? 0,
    genesisCreatorFid: vote.collectibleGenesisCreatorFid ?? null,
    genesisCreatorUsername:
      vote.collectibleGenesisCreatorUsername ?? null,
    ownerFid: vote.collectibleOwnerFid ?? null,
    ownerUsername: vote.collectibleOwnerUsername ?? null,
    ownerPhotoUrl: vote.collectibleOwner?.photoUrl ?? null,
    totalFeesEarned: vote.collectibleTotalFeesEarned ?? '0',
  });

  // Get isLastVoteForCombination from vote data
  const getIsLastVoteForCombination = (
    vote: VoteHistoryWithCollectibles
  ): boolean => {
    return vote.isLastVoteForCombination ?? false;
  };

  const toPodiumUser = (
    userCandidate?: Partial<User> | null,
    fallback?: Partial<User> | null
  ): User | null => {
    const source = userCandidate ?? fallback;
    if (!source?.fid || !source.username) {
      return null;
    }

    return {
      fid: Number(source.fid),
      username: source.username,
      photoUrl: source.photoUrl ?? '',
      createdAt: source.createdAt ?? '',
      points: source.points ?? 0,
      hasVotedToday: source.hasVotedToday ?? false,
      isNewUser: source.isNewUser ?? false,
    };
  };

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
              onClick={() => navigate('/vote')}
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
            {(Object.values(history.data) as VoteHistoryWithCollectibles[]).map((vote) => {
              const collectibleData = toCollectibleData(vote);
              const podiumUser = toPodiumUser(vote.user, authData);
              if (!podiumUser) return null;
              const brandIds: [number, number, number] = [
                vote.brand1.id,
                vote.brand2.id,
                vote.brand3.id,
              ];
              const isProcessing = processingPodiumId === vote.id;
              const collectibleTokenId = vote.collectibleTokenId;
              const isLastVoteForCombination =
                getIsLastVoteForCombination(vote);

              const individualPodium: NonNullable<
                IndividualPodiumProps['podium']
              > = {
                ...vote,
                user: {
                  fid: podiumUser.fid,
                  username: podiumUser.username,
                },
                collectibleTokenId:
                  vote.collectibleTokenId !== null &&
                  vote.collectibleTokenId !== undefined
                    ? String(vote.collectibleTokenId)
                    : null,
                claimed: false,
                brndPaidWhenCreatingPodium: null,
                collectibleOwner:
                  vote.collectibleOwner
                    ? toPodiumUser(vote.collectibleOwner, authData) ?? undefined
                    : undefined,
              };

              // Apply optimistic update if this podium was successfully transacted
              const hasSucceeded = successfulPodiums.has(vote.id);
              const successType = successfulPodiums.get(vote.id);
              const optimisticCollectibleData = hasSucceeded
                ? {
                  ...collectibleData,
                  isCollectible: true,
                  ownerFid: userFid,
                  ownerUsername: authData?.username || null,
                  ownerPhotoUrl: authData?.photoUrl || null,
                }
                : collectibleData;

              return (
                <li key={vote.id} className={styles.item}>
                  <IndividualPodium
                    podium={individualPodium}
                    user={podiumUser}
                    brand1={vote.brand1}
                    brand2={vote.brand2}
                    brand3={vote.brand3}
                    collectibleData={optimisticCollectibleData}
                    isLastVoteForCombination={
                      hasSucceeded ? true : isLastVoteForCombination
                    }
                    onMintClick={() => handleMintPodium(vote.id, brandIds)}
                    onBuyClick={() => {
                      if (collectibleTokenId) {
                        handleBuyPodium(vote.id, collectibleTokenId);
                      }
                    }}
                    isPending={
                      isProcessing && (isPending || isConfirming || isApproving || isFetchingSignature)
                    }
                    mintingStep={isProcessing ? currentMintingStep : null}
                    hasSucceeded={hasSucceeded}
                    successType={successType}
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
