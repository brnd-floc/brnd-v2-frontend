import { Brand } from '@/hooks/brands';
import { VotingViewEnum } from './types';

export type VotingState =
  | { type: 'loading' }
  | { type: 'not_voted' }
  | { type: 'recovering_vote'; hasClaimed: boolean }
  | {
      type: 'voted_not_shared';
      voteId: string;
      voteTransactionHash: string | null;
      brands: Brand[];
    }
  | {
      type: 'shared_not_claimed';
      voteId: string;
      voteTransactionHash: string | null;
      castHash: string | null;
      brands: Brand[];
    }
  | {
      type: 'claimed';
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
  date?: string;
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
    day?: number;
  } | null;
  todaysVote?: VoteRecord | null;
}

const SECONDS_PER_DAY = 86400;

export const normalizeVoteUnixDate = (value?: number): number | undefined => {
  if (!value || !Number.isSafeInteger(value) || value < 0) return undefined;
  // The contract returns an epoch day; /votes/:unixDate accepts epoch seconds.
  return value < 1000000 ? value * SECONDS_PER_DAY : value;
};

const hasCompleteBrands = (vote?: VoteRecord | null) =>
  Boolean(vote?.brand1 && vote?.brand2 && vote?.brand3);

const isVoteForDate = (vote: VoteRecord, unixDate?: number) => {
  if (!unixDate) return true;
  if (!vote.date) return false;
  return Math.floor(Date.parse(vote.date) / 86400000) ===
    Math.floor(unixDate / SECONDS_PER_DAY);
};

const isTransactionHash = (value?: string | null): value is string =>
  typeof value === 'string' && /^0x[\da-f]{64}$/i.test(value);

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
    user?.hasVotedToday || user?.todaysVoteStatus?.hasVoted,
  );
};

export const resolveTodaysVoteUnixDate = ({
  user,
  nowUnix,
}: {
  user: UserVoteContext | null | undefined;
  nowUnix: number;
}) => normalizeVoteUnixDate(user?.todaysVoteStatus?.day) || nowUnix;

export const shouldRefreshVoteData = ({
  votingStateType,
  isTransitioning,
  hasVoteStatus,
  hasBrandData,
}: {
  votingStateType: VotingState['type'];
  isTransitioning: boolean;
  hasVoteStatus: boolean;
  hasBrandData: boolean;
}) => {
  if (isTransitioning) {
    return false;
  }

  if (votingStateType !== 'recovering_vote') {
    return false;
  }

  return hasVoteStatus && !hasBrandData;
};

export const shouldRefreshAfterClaim = ({
  votingStateType,
  hasClaimed,
  isTransitioning,
}: {
  votingStateType: VotingState['type'];
  hasClaimed: boolean;
  isTransitioning: boolean;
}) =>
  votingStateType === 'shared_not_claimed' && hasClaimed && !isTransitioning;

export const shouldRedirectToVoteHome = (_params: {
  isLoading: boolean;
  isTransitioning: boolean;
  unixDate?: string;
  hasVoteRecord: boolean;
  hasVoted: boolean;
}) => {
  void _params;
  // Keep users in the vote flow instead of bouncing to home for date-route mismatches.
  // This avoids false negatives when route day and backend vote day drift.
  return false;
};

export const shouldFetchFallbackVoteData = ({
  user,
  unixDate,
}: {
  user: UserVoteContext | null | undefined;
  unixDate?: string;
}) => {
  if (!user) return false;

  const hasVoteStatus = user.todaysVoteStatus?.hasVoted || user.hasVotedToday;
  const hasVoteData = hasCompleteBrands(user.todaysVote);

  return Boolean(
    (unixDate && !user.todaysVote && !user.todaysVoteStatus) ||
      (hasVoteStatus && !hasVoteData)
  );
};

export const resolveFallbackUnixDate = ({
  unixDate,
  user,
  nowUnix = Math.floor(Date.now() / 1000),
}: {
  unixDate?: string;
  user: UserVoteContext | null | undefined;
  nowUnix?: number;
}) => {
  const statusDate = normalizeVoteUnixDate(user?.todaysVoteStatus?.day);
  // Today's confirmed vote wins over a stale or malformed route from a prior session.
  if (statusDate) return statusDate;
  if (user?.hasVotedToday) return Math.floor(nowUnix / SECONDS_PER_DAY) * SECONDS_PER_DAY;
  return normalizeVoteUnixDate(Number(unixDate));
};

export const resolveVoteRecord = ({
  userVote,
  fallbackVotes,
  expectedUnixDate,
}: {
  userVote: VoteRecord | null | undefined;
  fallbackVotes: VoteRecord | null | undefined;
  expectedUnixDate?: number;
}) => {
  if (hasCompleteBrands(userVote) &&
    (!userVote?.date || isVoteForDate(userVote, expectedUnixDate))) return userVote!;
  if (fallbackVotes && hasCompleteBrands(fallbackVotes) &&
    isVoteForDate(fallbackVotes, expectedUnixDate)) return fallbackVotes;
  return null;
};

export const buildVotingState = ({
  user,
  votes,
  authLoading,
  needsFallbackData,
  fallbackLoading,
}: BuildVotingStateParams): VotingState => {
  if (!user) {
    return { type: 'loading' };
  }

  const status = user.todaysVoteStatus;
  const hasVoted = Boolean(status?.hasVoted || user.hasVotedToday);
  const brandData = resolveVoteRecord({
    userVote: user.todaysVote,
    fallbackVotes: votes,
    expectedUnixDate: resolveTodaysVoteUnixDate({ user, nowUnix: Math.floor(Date.now() / 1000) }),
  });
  const hasBrandData = hasCompleteBrands(brandData);

  if (!hasVoted && !hasBrandData && (authLoading || (needsFallbackData && fallbackLoading))) {
    return { type: 'loading' };
  }

  const voteTransactionHash = [status?.transactionHash, status?.voteId, brandData?.id]
    .find(isTransactionHash) || null;
  const castHash = status?.castHash ?? null;
  const claimTransactionHash =
    user?.contextualTransaction?.transactionType === 'claim'
      ? (user.contextualTransaction.transactionHash ?? null)
      : null;

  const hasClaimed = Boolean(
    status?.hasClaimed || (claimTransactionHash && status?.hasShared)
  );
  const resolvedVoteId =
    voteTransactionHash || status?.voteId || brandData?.id || '';
  const orderedBrands =
    hasBrandData && brandData?.brand1 && brandData?.brand2 && brandData?.brand3
      ? ([brandData.brand2, brandData.brand1, brandData.brand3] as Brand[])
      : null;

  if ((hasVoted || hasClaimed) && (!orderedBrands || !voteTransactionHash)) {
    return { type: 'recovering_vote', hasClaimed };
  }

  if (hasClaimed && orderedBrands) {
    return {
      type: 'claimed',
      voteId: resolvedVoteId,
      voteTransactionHash,
      castHash,
      claimTransactionHash,
      brands: orderedBrands,
    };
  }

  if (status?.hasShared && hasVoted && orderedBrands) {
    return {
      type: 'shared_not_claimed',
      voteId: resolvedVoteId,
      voteTransactionHash,
      castHash,
      brands: orderedBrands,
    };
  }

  if (hasVoted && orderedBrands) {
    return {
      type: 'voted_not_shared',
      voteId: resolvedVoteId,
      voteTransactionHash,
      brands: orderedBrands,
    };
  }

  return { type: 'not_voted' };
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
  if (votingState.type === 'loading' || votingState.type === 'not_voted' ||
    votingState.type === 'recovering_vote') {
    return {
      navigateToView,
      currentView: VotingViewEnum.PODIUM,
      currentBrands: [] as Brand[],
      currentVoteId: '',
      voteTransactionHash: undefined as string | undefined,
      claimTransactionHash: undefined as string | undefined,
      castHash: undefined as string | undefined,
      transactionHash: undefined as string | undefined,
    };
  }

  const baseProps = {
    navigateToView,
    currentView:
      votingState.type === 'voted_not_shared' || votingState.type === 'shared_not_claimed'
        ? VotingViewEnum.SHARE
        : VotingViewEnum.CONGRATS,
    currentBrands: votingState.brands,
    currentVoteId: votingState.voteId,
    voteTransactionHash: votingState.voteTransactionHash || undefined,
    transactionHash: votingState.voteTransactionHash || undefined,
  };

  if (votingState.type === 'claimed') {
    return {
      ...baseProps,
      castHash: votingState.castHash || undefined,
      claimTransactionHash: votingState.claimTransactionHash || undefined,
    };
  }

  if (votingState.type === 'shared_not_claimed') {
    return {
      ...baseProps,
      castHash: votingState.castHash || undefined,
    };
  }

  return baseProps;
};
