import type { User } from '../hooks/user';

/** A confirmation belongs to the vote's signed day, even after UTC midnight. */
export const resolveRewardDay = (
  confirmedDay?: number,
  savedDay?: number,
  now = Date.now(),
): number => confirmedDay ?? savedDay ?? Math.floor(now / 86400000);

export const buildOnchainVoteRecovery = (
  current: User | undefined,
  now = Date.now(),
): Pick<User, 'hasVotedToday' | 'todaysVoteStatus'> => {
  const day = Math.floor(now / 86400000);
  const status = current?.todaysVoteStatus?.day === day ? current.todaysVoteStatus : null;
  return {
    hasVotedToday: true,
    todaysVoteStatus: {
      hasVoted: true,
      hasShared: status?.hasShared ?? false,
      hasClaimed: status?.hasClaimed ?? false,
      voteId: status?.voteId ?? null,
      transactionHash: status?.transactionHash ?? null,
      castHash: status?.castHash ?? null,
      day,
    },
  };
};

/** Keep confirmed progress while the indexer catches up, scoped to this user/day. */
export const reconcileAuthRefresh = (
  current: User | undefined,
  incoming: User,
  now = Date.now(),
): User => {
  const previous = current?.todaysVoteStatus;
  const next = incoming.todaysVoteStatus;
  const today = Math.floor(now / 86400000);
  if (
    !current || String(current.fid) !== String(incoming.fid) ||
    previous?.day !== today || (next && next.day !== today) ||
    (previous.transactionHash && next?.transactionHash &&
      previous.transactionHash !== next.transactionHash)
  ) {
    return incoming;
  }

  return {
    ...incoming,
    hasVotedToday: incoming.hasVotedToday || current.hasVotedToday,
    todaysVote: incoming.todaysVote?.brand1 && incoming.todaysVote?.brand2 &&
      incoming.todaysVote?.brand3 ? incoming.todaysVote : current.todaysVote,
    todaysVoteStatus: {
      ...previous,
      ...next,
      hasVoted: Boolean(previous.hasVoted || next?.hasVoted),
      hasShared: Boolean(previous.hasShared || next?.hasShared),
      hasClaimed: Boolean(previous.hasClaimed || next?.hasClaimed),
      voteId: next?.voteId || previous.voteId,
      transactionHash: next?.transactionHash || previous.transactionHash,
      castHash: next?.castHash || previous.castHash,
      day: today,
    },
    contextualTransaction: previous.hasClaimed && !next?.hasClaimed
      ? current.contextualTransaction : incoming.contextualTransaction,
  };
};

/** Deduplicate an explicit refresh; invalidate prevents a late result after logout. */
export const createAuthRefresher = <T>({
  load,
  onStart,
  onSuccess,
  onError,
  onSettled,
  timeoutMs = 15000,
}: {
  load: () => Promise<T>;
  onStart: () => void;
  onSuccess: (data: T) => void;
  onError: (error: Error) => void;
  onSettled: () => void;
  timeoutMs?: number;
}) => {
  let pending: Promise<void> | null = null;
  let generation = 0;

  return {
    refresh: (): Promise<void> => {
      if (pending) return pending;
      const requestGeneration = generation;
      onStart();
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Account refresh timed out. Please retry.')), timeoutMs);
      });
      const request = Promise.race([Promise.resolve().then(load), timeout]).then((data) => {
        if (requestGeneration === generation) onSuccess(data);
      }).catch((error: unknown) => {
        const refreshError = error instanceof Error
          ? error : new Error('Unable to refresh your podium. Please retry.');
        if (requestGeneration === generation) onError(refreshError);
        throw refreshError;
      }).finally(() => {
        clearTimeout(timer);
        if (pending === request) pending = null;
        if (requestGeneration === generation) onSettled();
      });
      pending = request;
      return request;
    },
    invalidate: () => {
      generation += 1;
      pending = null;
    },
  };
};
