import type { StoriesOperationToken } from './useStoriesInMotion.async';
import { getStoriesErrorMeta } from './useStoriesInMotion.errors';
import { ensureVoteAuthData, isVoteAuthResponse } from './useStoriesInMotion.signatures';

export const resolveRetryAuthData = async ({
  pendingVoteAuthData,
  isWalletAuthorized,
  userFid,
  pendingVoteBrandIds,
  getVoteAuthorizationSignature,
}: {
  pendingVoteAuthData: string | null;
  isWalletAuthorized: boolean;
  userFid: number | null;
  pendingVoteBrandIds: [number, number, number];
  getVoteAuthorizationSignature: (
    brandIds: [number, number, number],
    deadline: number
  ) => Promise<unknown>;
}): Promise<string> => {
  let authDataToUse = pendingVoteAuthData || '0x';

  if (!isWalletAuthorized && (!authDataToUse || authDataToUse === '0x')) {
    if (userFid) {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const voteAuth = await getVoteAuthorizationSignature(
        pendingVoteBrandIds,
        deadline
      );
      if (!isVoteAuthResponse(voteAuth)) {
        throw new Error('Invalid vote authorization response');
      }
      authDataToUse = ensureVoteAuthData(voteAuth);
    }
  }

  return authDataToUse;
};

export const runRetryVoteAfterApprove = async ({
  operationToken,
  isOperationActive,
  refetchAllowance,
  pendingVoteAuthData,
  isWalletAuthorized,
  userFid,
  pendingVoteBrandIds,
  getVoteAuthorizationSignature,
  submitVoteTransaction,
  clearPendingVoteData,
}: {
  operationToken: StoriesOperationToken;
  isOperationActive: (token: StoriesOperationToken) => boolean;
  refetchAllowance: () => Promise<unknown>;
  pendingVoteAuthData: string | null;
  isWalletAuthorized: boolean;
  userFid: number | null;
  pendingVoteBrandIds: [number, number, number];
  getVoteAuthorizationSignature: (
    brandIds: [number, number, number],
    deadline: number
  ) => Promise<unknown>;
  submitVoteTransaction: (
    brandIds: [number, number, number],
    authData: string
  ) => Promise<void>;
  clearPendingVoteData: () => void;
}) => {
  if (!isOperationActive(operationToken)) {
    return;
  }

  await refetchAllowance();

  const authDataToUse = await resolveRetryAuthData({
    pendingVoteAuthData,
    isWalletAuthorized,
    userFid,
    pendingVoteBrandIds,
    getVoteAuthorizationSignature,
  });

  await submitVoteTransaction(pendingVoteBrandIds, authDataToUse);
  clearPendingVoteData();
};

export const scheduleApprovedVoteRetry = ({
  pendingVoteBrandIds,
  startOperationToken,
  isOperationActive,
  refetchAllowance,
  pendingVoteAuthData,
  isWalletAuthorized,
  userFid,
  getVoteAuthorizationSignature,
  submitVoteTransaction,
  clearPendingVoteData,
  logStoriesError,
}: {
  pendingVoteBrandIds: [number, number, number] | null;
  startOperationToken: () => StoriesOperationToken;
  isOperationActive: (token: StoriesOperationToken) => boolean;
  refetchAllowance: () => Promise<unknown>;
  pendingVoteAuthData: string | null;
  isWalletAuthorized: boolean;
  userFid: number | null;
  getVoteAuthorizationSignature: (
    brandIds: [number, number, number],
    deadline: number
  ) => Promise<unknown>;
  submitVoteTransaction: (
    brandIds: [number, number, number],
    authData: string
  ) => Promise<void>;
  clearPendingVoteData: () => void;
  logStoriesError: (...args: unknown[]) => void;
}) => {
  if (!pendingVoteBrandIds) {
    return;
  }

  const operationToken = startOperationToken();

  setTimeout(async () => {
    try {
      await runRetryVoteAfterApprove({
        operationToken,
        isOperationActive,
        refetchAllowance,
        pendingVoteAuthData,
        isWalletAuthorized,
        userFid,
        pendingVoteBrandIds,
        getVoteAuthorizationSignature,
        submitVoteTransaction,
        clearPendingVoteData,
      });
    } catch (error: unknown) {
      if (!isOperationActive(operationToken)) {
        return;
      }
      logStoriesError('❌ [Approve] Auto-retry vote after approval failed:', error);
      logStoriesError('❌ [Approve] Error details:', getStoriesErrorMeta(error));
      clearPendingVoteData();
    }
  }, 1000);
};
