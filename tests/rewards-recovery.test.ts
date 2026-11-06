import { describe, expect, mock, test } from 'bun:test';
import {
  buildVotingState,
  normalizeVoteUnixDate,
  resolveFallbackUnixDate,
  resolveTodaysVoteUnixDate,
  resolveVoteRecord,
  shouldFetchFallbackVoteData,
} from '../src/pages/VotePage/viewModel';
import { getShareActionState } from '../src/pages/VotePage/partials/ShareView/viewModel';
import { getAlreadySharedUiState } from '../src/pages/VotePage/partials/AlreadySharedView/viewModel';
import {
  buildOnchainVoteRecovery,
  createAuthRefresher,
  reconcileAuthRefresh,
  resolveRewardDay,
} from '../src/shared/providers/authRefresh';
import { getApiResponseError } from '../src/services/api/errors';
import {
  resolveClaimSignatureRequest,
  RewardAlreadyClaimedError,
  runLegacyClaimRewardFlow,
} from '../src/shared/hooks/contract/useStoriesInMotion.claim';
import type { User } from '../src/shared/hooks/user';
import type { Brand } from '../src/shared/hooks/brands';

const now = Date.now();
const day = Math.floor(now / 86400000);
const unixDate = day * 86400;
const voteHash = `0x${'a'.repeat(64)}`;
const castHash = `0x${'b'.repeat(40)}`;
const wallet = `0x${'1'.repeat(40)}`;
const brands = [1, 2, 3].map((id) => ({ id, name: `Brand ${id}` }) as Brand);
const vote = {
  id: voteHash,
  date: new Date(unixDate * 1000).toISOString(),
  brand1: brands[0], brand2: brands[1], brand3: brands[2],
};
const user = (overrides: Partial<User> = {}): User => ({
  fid: 123,
  username: 'voter',
  photoUrl: '',
  createdAt: vote.date,
  points: 0,
  hasVotedToday: true,
  isNewUser: false,
  todaysVote: vote,
  todaysVoteStatus: {
    hasVoted: true, hasShared: false, hasClaimed: false,
    voteId: voteHash, transactionHash: voteHash, castHash: null, day,
  },
  ...overrides,
});
const state = (data: User, fallbackVotes: typeof vote | null = null) => buildVotingState({
  user: data,
  votes: fallbackVotes,
  authLoading: false,
  needsFallbackData: true,
  fallbackLoading: false,
});

describe('resume an existing daily vote', () => {
  test('missing podium data leads to recovery, never a second vote', () => {
    const data = user({ todaysVote: null });
    expect(state(data)).toEqual({ type: 'recovering_vote', hasClaimed: false });
    expect(shouldFetchFallbackVoteData({ user: data })).toBe(true);
    const recovered = state(data, vote);
    expect(recovered.type).toBe('voted_not_shared');
    expect('voteId' in recovered && recovered.voteId).toBe(voteHash);
  });

  test('a complete same-day fallback is not hidden by a partial /me podium', () => {
    const partial = { id: voteHash, date: vote.date, brand1: brands[0] };
    const resolved = resolveVoteRecord({
      userVote: partial, fallbackVotes: vote, expectedUnixDate: unixDate,
    });
    expect(resolved).toEqual(vote);
    expect(state(user({ todaysVote: partial as typeof vote }), vote).type).toBe('voted_not_shared');
  });

  test('a fallback from a different UTC day cannot resume this vote', () => {
    const yesterday = { ...vote, date: new Date((unixDate - 86400) * 1000).toISOString() };
    expect(resolveVoteRecord({
      userVote: null, fallbackVotes: yesterday, expectedUnixDate: unixDate,
    })).toBeNull();
    expect(state(user({ todaysVote: null }), yesterday).type).toBe('recovering_vote');
  });

  test('contract days become seconds and the current vote wins over an old route', () => {
    expect(normalizeVoteUnixDate(day)).toBe(unixDate);
    expect(normalizeVoteUnixDate(unixDate)).toBe(unixDate);
    expect(normalizeVoteUnixDate(Number.NaN)).toBeUndefined();
    expect(resolveTodaysVoteUnixDate({ user: user(), nowUnix: unixDate + 5 })).toBe(unixDate);
    expect(resolveFallbackUnixDate({ user: user(), unixDate: String(unixDate - 86400) }))
      .toBe(unixDate);
  });

  test('an onchain vote survives a lagging /me with no vote status', () => {
    const lagging = user({ hasVotedToday: false, todaysVoteStatus: null, todaysVote: null });
    const confirmed = { ...lagging, ...buildOnchainVoteRecovery(lagging, now) };
    expect(state(confirmed).type).toBe('recovering_vote');
    const refreshed = reconcileAuthRefresh(confirmed, lagging, now);
    expect(refreshed.hasVotedToday).toBe(true);
    expect(refreshed.todaysVoteStatus?.hasVoted).toBe(true);
    expect(state(refreshed).type).toBe('recovering_vote');
  });

  test('recovery uses one stable query key throughout the same day without backend day data', () => {
    const data = user({ todaysVoteStatus: null, todaysVote: null });
    expect(resolveFallbackUnixDate({ user: data, nowUnix: unixDate + 1 })).toBe(unixDate);
    expect(resolveFallbackUnixDate({ user: data, nowUnix: unixDate + 7000 })).toBe(unixDate);
  });

  test('a shared but unclaimed vote resumes the claim screen', () => {
    const data = user();
    data.todaysVoteStatus = { ...data.todaysVoteStatus!, hasShared: true, castHash };
    expect(state(data).type).toBe('shared_not_claimed');
  });

  test('a confirmed reward is not offered again even if the indexer briefly lags', () => {
    const claimed = user();
    claimed.todaysVoteStatus = {
      ...claimed.todaysVoteStatus!, hasShared: true, hasClaimed: true, castHash,
    };
    const refreshed = reconcileAuthRefresh(claimed, user(), now);
    expect(state(refreshed).type).toBe('claimed');
    expect(getAlreadySharedUiState({
      hasClaimData: false, isLoadingClaimData: false, isClaiming: false,
      isClaimPending: false, isClaimConfirming: false, hasClaimed: true,
    }).buttonDisabled).toBe(true);
    expect(state({ ...refreshed, todaysVote: null })).toEqual({
      type: 'recovering_vote', hasClaimed: true,
    });
  });

  test('confirmed progress is never carried to another user or a new UTC day', () => {
    const current = user();
    const other = user({ fid: 456, hasVotedToday: false, todaysVoteStatus: null });
    expect(reconcileAuthRefresh(current, other, now)).toBe(other);
    const tomorrow = user({
      hasVotedToday: false, todaysVote: null,
      todaysVoteStatus: { ...current.todaysVoteStatus!, hasVoted: false, day: day + 1 },
    });
    expect(reconcileAuthRefresh(current, tomorrow, (unixDate + 86400) * 1000)).toBe(tomorrow);
  });

  test('a claim confirmed after midnight does not block the next daily vote', () => {
    const yesterday = day - 1;
    const claimedDay = resolveRewardDay(yesterday, day, now);
    expect(claimedDay).toBe(yesterday);
    expect(resolveRewardDay(undefined, yesterday, now)).toBe(yesterday);
    const claimed = user({
      todaysVote: { ...vote, date: new Date((unixDate - 86400) * 1000).toISOString() },
      todaysVoteStatus: {
        ...user().todaysVoteStatus!, day: claimedDay, hasShared: true, hasClaimed: true, castHash,
      },
    });
    const today = user({ hasVotedToday: false, todaysVote: null, todaysVoteStatus: null });
    const refreshed = reconcileAuthRefresh(claimed, today, now);
    expect(refreshed).toBe(today);
    expect(state(refreshed).type).toBe('not_voted');
  });
});

describe('explicit refresh after an outage', () => {
  test('deduplicates concurrent reads and performs a fresh read on retry after failure', async () => {
    let attempts = 0;
    let visible = user({ todaysVote: null });
    const onError = mock(() => undefined);
    const refresher = createAuthRefresher({
      load: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('Temporary outage');
        return user();
      },
      onStart: () => undefined,
      onSuccess: (data) => { visible = data; },
      onError,
      onSettled: () => undefined,
    });
    const first = refresher.refresh();
    expect(refresher.refresh()).toBe(first);
    await expect(first).rejects.toThrow('Temporary outage');
    expect(attempts).toBe(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(state(visible).type).toBe('recovering_vote');
    await refresher.refresh();
    expect(attempts).toBe(2);
    expect(state(visible).type).toBe('voted_not_shared');
  });

  test('ignores a late refresh result after logout', async () => {
    let complete!: (data: User) => void;
    const onSuccess = mock(() => undefined);
    const refresher = createAuthRefresher({
      load: () => new Promise<User>((resolve) => { complete = resolve; }),
      onStart: () => undefined, onSuccess,
      onError: () => undefined, onSettled: () => undefined,
    });
    const pending = refresher.refresh();
    await Promise.resolve();
    refresher.invalidate();
    complete(user());
    await pending;
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('a hung refresh times out and permits a new attempt', async () => {
    let attempts = 0;
    const onSuccess = mock(() => undefined);
    const refresher = createAuthRefresher({
      load: () => ++attempts === 1 ? new Promise<User>(() => undefined) : Promise.resolve(user()),
      onStart: () => undefined, onSuccess,
      onError: () => undefined, onSettled: () => undefined, timeoutMs: 5,
    });
    await expect(refresher.refresh()).rejects.toThrow('timed out');
    await refresher.refresh();
    expect(attempts).toBe(2);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('share and reward recovery', () => {
  test('Farcaster verification can be retried without composing another post', () => {
    const action = getShareActionState({
      isSharing: false, isVerifying: false, isClaiming: false,
      isClaimPending: false, isClaimConfirming: false, hasClaimData: false,
      hasSharedManually: true, isFarcasterClient: true,
    });
    expect(action.uiState.primaryAction).toBe('manual-verify');
    expect(action.uiState.disablePrimaryButton).toBe(false);
    expect(action.buttonCaption).toBe('Retry verification');
  });

  test('claim submission stays disabled while a wallet transaction is pending', () => {
    const action = getShareActionState({
      isSharing: false, isVerifying: false, isClaiming: true,
      isClaimPending: true, isClaimConfirming: false, hasClaimData: true,
      hasSharedManually: true, isFarcasterClient: true,
    });
    expect(action.uiState.disablePrimaryButton).toBe(true);
  });

  test('preserves retryable backend messages, codes and HTTP status', () => {
    for (const code of ['REWARD_CLAIM_UNAVAILABLE', 'SHARE_VERIFICATION_UNAVAILABLE']) {
      const error = getApiResponseError(503, 'Service Unavailable', {
        action: 'verifyShare', data: { code, message: 'Your vote is saved. Please retry.', retryable: true },
      });
      expect(error.message).toBe('Your vote is saved. Please retry.');
      expect(error.code).toBe(code);
      expect(error.status).toBe(503);
      expect(error.retryable).toBe(true);
    }
  });

  test('a backend already-claimed response stops before any second onchain claim', async () => {
    const executeClaimReward = mock(async () => undefined);
    await expect(runLegacyClaimRewardFlow({
      castHash, voteId: voteHash, transactionHash: voteHash,
      recipient: wallet, castedFrom: 9152, userAddress: wallet,
      verifyShareAndGetClaimSignature: async () => resolveClaimSignatureRequest({
        setError: () => undefined, userAddress: wallet, userFid: 123,
        assertActiveOperation: () => undefined, operationToken: { id: 1 },
        requestSignature: async () => ({ day, hasClaimed: true, claimSignature: null }),
        voteId: voteHash, transactionHash: voteHash, recipientOverride: wallet,
        castedFrom: 9152, supersededMessage: 'Superseded',
      }),
      executeClaimReward,
      shouldIgnoreOperationError: () => false,
      logStoriesError: () => undefined, setError: () => undefined,
    })).rejects.toBeInstanceOf(RewardAlreadyClaimedError);
    expect(executeClaimReward).not.toHaveBeenCalled();
  });
});
