import { Brand } from "@/hooks/brands";
import { VotingViewEnum } from "./types";

export type VotingState =
  | { type: "loading" }
  | { type: "not_voted" }
  | {
      type: "voted_not_shared";
      voteId: string;
      voteTransactionHash: string | null;
      brands: Brand[];
    }
  | {
      type: "shared_not_claimed";
      voteId: string;
      voteTransactionHash: string | null;
      castHash: string | null;
      brands: Brand[];
    }
  | {
      type: "claimed";
      voteId: string;
      voteTransactionHash: string | null;
      castHash: string | null;
      claimTransactionHash: string | null;
      brands: Brand[];
    };

interface BuildVotingStateParams {
  user: UserVoteContext | null | undefined;
  votes: VoteRecord | null;
  authLoading: boolean;
  needsFallbackData: boolean;
  fallbackLoading: boolean;
}

interface VoteRecord {
  id?: string;
  brand1?: Brand;
  brand2?: Brand;
  brand3?: Brand;
}

interface UserVoteContext {
  hasVotedToday?: boolean;
  todaysVoteStatus?: {
    hasVoted?: boolean;
    hasShared?: boolean;
    hasClaimed?: boolean;
    voteId?: string | null;
    castHash?: string | null;
    transactionHash?: string | null;
    day?: number;
  } | null;
  contextualTransaction?: {
    transactionType?: string | null;
    transactionHash?: string | null;
  } | null;
  todaysVote?: VoteRecord | null;
}

export const shouldAutoRedirectToTodaysVote = ({
  isLoading,
  isTransitioning,
  unixDate,
  user,
}: {
  isLoading: boolean;
  isTransitioning: boolean;
  unixDate?: string;
  user: UserVoteContext | null | undefined;
}) => {
  if (isLoading || isTransitioning || unixDate) {
    return false;
  }

  return Boolean(
    user?.hasVotedToday &&
      (user?.todaysVote?.id || user?.todaysVoteStatus?.hasVoted),
  );
};

export const resolveTodaysVoteUnixDate = ({
  user,
  nowUnix,
}: {
  user: UserVoteContext | null | undefined;
  nowUnix: number;
}) => user?.todaysVoteStatus?.day || nowUnix;

export const shouldRefreshVoteData = ({
  votingStateType,
  isTransitioning,
  hasVoteStatus,
  hasBrandData,
}: {
  votingStateType: VotingState["type"];
  isTransitioning: boolean;
  hasVoteStatus: boolean;
  hasBrandData: boolean;
}) => {
  if (isTransitioning) {
    return false;
  }

  if (votingStateType === "loading" || votingStateType === "not_voted") {
    return false;
  }

  return hasVoteStatus && !hasBrandData;
};

export const shouldRefreshAfterClaim = ({
  votingStateType,
  hasClaimed,
  isTransitioning,
}: {
  votingStateType: VotingState["type"];
  hasClaimed: boolean;
  isTransitioning: boolean;
}) =>
  votingStateType === "shared_not_claimed" && hasClaimed && !isTransitioning;

export const shouldRedirectToVoteHome = ({
  isLoading,
  isTransitioning,
  unixDate,
  hasVoteRecord,
  hasVoted,
}: {
  isLoading: boolean;
  isTransitioning: boolean;
  unixDate?: string;
  hasVoteRecord: boolean;
  hasVoted: boolean;
}) =>
  !isLoading && !isTransitioning && Boolean(unixDate) && !hasVoteRecord && !hasVoted;

export const shouldFetchFallbackVoteData = ({
  user,
  unixDate,
}: {
  user: UserVoteContext | null | undefined;
  unixDate?: string;
}) => {
  if (!user) return false;

  const hasVoteStatus = user.todaysVoteStatus?.hasVoted;
  const hasVoteData =
    user.todaysVote?.brand1 && user.todaysVote?.brand2 && user.todaysVote?.brand3;

  return Boolean(
    (unixDate && !user.todaysVote && !user.todaysVoteStatus) ||
      (hasVoteStatus && !hasVoteData && user.todaysVoteStatus?.day)
  );
};

export const resolveFallbackUnixDate = ({
  unixDate,
  user,
}: {
  unixDate?: string;
  user: UserVoteContext | null | undefined;
}) => {
  if (unixDate) return Number(unixDate);
  if (user?.todaysVoteStatus?.day) return user.todaysVoteStatus.day;
  return undefined;
};

export const resolveVoteRecord = ({
  userVote,
  fallbackVotes,
}: {
  userVote: VoteRecord | null | undefined;
  fallbackVotes: VoteRecord | null | undefined;
}) => userVote || fallbackVotes || null;

export const buildVotingState = ({
  user,
  votes,
  authLoading,
  needsFallbackData,
  fallbackLoading,
}: BuildVotingStateParams): VotingState => {
  if (!user) {
    return { type: "loading" };
  }

  const status = user.todaysVoteStatus;
  const brandData = user.todaysVote || votes;
  const hasBrandData = !!(brandData?.brand1 && brandData?.brand2 && brandData?.brand3);

  if (status?.hasVoted && hasBrandData) {
    // Continue to state resolution.
  } else if (authLoading && !hasBrandData && !status?.hasVoted) {
    return { type: "loading" };
  } else if (status?.hasVoted && !hasBrandData && needsFallbackData && fallbackLoading) {
    return { type: "loading" };
  }

  const voteTransactionHash = status?.transactionHash ?? null;
  const castHash = status?.castHash ?? null;
  const claimTransactionHash =
    user?.contextualTransaction?.transactionType === "claim"
      ? (user.contextualTransaction.transactionHash ?? null)
      : null;

  const hasClaimed = Boolean(
    status?.hasClaimed || (claimTransactionHash && status?.hasShared)
  );
  const resolvedVoteId =
    status?.voteId || status?.transactionHash || user.todaysVote?.id || votes?.id || "";
  const orderedBrands =
    hasBrandData && brandData?.brand1 && brandData?.brand2 && brandData?.brand3
      ? ([brandData.brand2, brandData.brand1, brandData.brand3] as Brand[])
      : null;

  if (hasClaimed && orderedBrands) {
    return {
      type: "claimed",
      voteId: resolvedVoteId,
      voteTransactionHash,
      castHash,
      claimTransactionHash,
      brands: orderedBrands,
    };
  }

  if (status?.hasShared && status?.hasVoted && orderedBrands) {
    return {
      type: "shared_not_claimed",
      voteId: resolvedVoteId,
      voteTransactionHash,
      castHash,
      brands: orderedBrands,
    };
  }

  if (status?.hasVoted && orderedBrands) {
    return {
      type: "voted_not_shared",
      voteId: resolvedVoteId,
      voteTransactionHash,
      brands: orderedBrands,
    };
  }

  return { type: "not_voted" };
};

export const buildVoteViewProps = ({
  votingState,
  navigateToView,
}: {
  votingState: VotingState;
  navigateToView: (
    id: VotingViewEnum,
    selection: Brand[],
    voteId: string,
    transactionHash?: string,
    castHash?: string
  ) => void;
}) => {
  if (votingState.type === "loading" || votingState.type === "not_voted") {
    return {
      navigateToView,
      currentView: VotingViewEnum.PODIUM,
      currentBrands: [] as Brand[],
      currentVoteId: "",
      voteTransactionHash: undefined as string | undefined,
      claimTransactionHash: undefined as string | undefined,
      castHash: undefined as string | undefined,
      transactionHash: undefined as string | undefined,
    };
  }

  const baseProps = {
    navigateToView,
    currentView:
      votingState.type === "voted_not_shared" || votingState.type === "shared_not_claimed"
        ? VotingViewEnum.SHARE
        : VotingViewEnum.CONGRATS,
    currentBrands: votingState.brands,
    currentVoteId: votingState.voteId,
    voteTransactionHash: votingState.voteTransactionHash || undefined,
    transactionHash: votingState.voteTransactionHash || undefined,
  };

  if (votingState.type === "claimed") {
    return {
      ...baseProps,
      castHash: votingState.castHash || undefined,
      claimTransactionHash: votingState.claimTransactionHash || undefined,
    };
  }

  if (votingState.type === "shared_not_claimed") {
    return {
      ...baseProps,
      castHash: votingState.castHash || undefined,
    };
  }

  return baseProps;
};
