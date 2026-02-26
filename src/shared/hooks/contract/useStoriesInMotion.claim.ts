import type { StoriesOperationToken } from './useStoriesInMotion.async';
import { asHexAddress } from './useStoriesInMotion.signatures';
import { validateClaimVerificationInput, validateWalletAuthorizedInput } from './useStoriesInMotion.validation';
import type {
  ClaimSignatureRequest,
  ClaimSignatureRequestResult,
} from './useStoriesInMotion.types';

type ClaimSignatureShape = ClaimSignatureRequestResult['claimSignature'];

export const validateClaimSignatureContext = ({
  userAddress,
  userFid,
  voteId,
  castedFrom,
  recipientOverride,
}: {
  userAddress?: string;
  userFid: number | null;
  voteId: string;
  castedFrom: number;
  recipientOverride: string;
}): string => {
  const normalizedUserAddress = asHexAddress(userAddress);
  const authValidationError = validateWalletAuthorizedInput({
    userAddress: normalizedUserAddress,
    userFid,
  });
  if (authValidationError) {
    throw new Error(authValidationError);
  }

  const claimValidationError = validateClaimVerificationInput({
    voteId,
    castedFrom,
  });
  if (claimValidationError) {
    throw new Error(claimValidationError);
  }

  return recipientOverride || normalizedUserAddress!;
};

export const resolveClaimSignatureRequest = async ({
  setError,
  userAddress,
  userFid,
  assertActiveOperation,
  operationToken,
  requestSignature,
  voteId,
  transactionHash,
  recipientOverride,
  castedFrom,
  supersededMessage,
  verificationMessage,
}: {
  setError: (message: string | null) => void;
  userAddress?: string;
  userFid: number | null;
  assertActiveOperation: (
    operationToken: StoriesOperationToken,
    message: string
  ) => void;
  operationToken: StoriesOperationToken;
  requestSignature: ClaimSignatureRequest;
  voteId: string;
  transactionHash: string;
  recipientOverride: string;
  castedFrom: number;
  supersededMessage: string;
  verificationMessage?: string;
}): Promise<ClaimSignatureRequestResult> => {
  setError(null);
  const recipientAddress = validateClaimSignatureContext({
    userAddress,
    userFid,
    voteId,
    castedFrom,
    recipientOverride,
  });

  const verifyData = await requestSignature(
    voteId,
    recipientAddress,
    transactionHash,
    castedFrom
  );

  assertActiveOperation(operationToken, supersededMessage);

  if (verificationMessage && verifyData.verified === false) {
    throw new Error(verificationMessage);
  }

  if (!verifyData.claimSignature) {
    throw new Error(
      'Claim signature not available. Please ensure the vote was shared and verified.'
    );
  }

  return {
    claimSignature: verifyData.claimSignature,
    day: verifyData.day,
    amount: verifyData.claimSignature.amount,
    castHash: verifyData.castHash || '',
  };
};

export const verifyShareAndGetClaimSignatureCoordinator = async ({
  startOperationToken,
  resolveRequest,
  castHash,
  voteId,
  transactionHash,
  recipientOverride,
  castedFrom,
  getClaimRewardSignature,
}: {
  startOperationToken: () => StoriesOperationToken;
  resolveRequest: (params: {
    operationToken: StoriesOperationToken;
    requestSignature: ClaimSignatureRequest;
    voteId: string;
    transactionHash: string;
    recipientOverride: string;
    castedFrom: number;
    supersededMessage: string;
    verificationMessage?: string;
  }) => Promise<ClaimSignatureRequestResult>;
  castHash: string;
  voteId: string;
  transactionHash: string;
  recipientOverride: string;
  castedFrom: number;
  getClaimRewardSignature: (
    castHash: string,
    voteId: string,
    recipientAddress: string,
    transactionHash: string,
    castedFrom: number
  ) => Promise<{
    claimSignature?:
      | {
          signature: string;
          amount: string;
          deadline: number;
          nonce: number;
          canClaim: boolean;
        }
      | null;
    day: number;
    castHash?: string;
    verified?: boolean;
  }>;
}): Promise<ClaimSignatureRequestResult> => {
  const operationToken = startOperationToken();
  return resolveRequest({
    operationToken,
    requestSignature: (voteIdArg, recipientAddress, txHash, castedFromArg) =>
      getClaimRewardSignature(
        castHash,
        voteIdArg,
        recipientAddress,
        txHash,
        castedFromArg
      ),
    voteId,
    transactionHash,
    recipientOverride,
    castedFrom,
    supersededMessage: 'Verification request superseded by newer operation',
    verificationMessage: 'Share verification failed',
  });
};

export const getClaimSignatureForSharedVoteCoordinator = async ({
  startOperationToken,
  resolveRequest,
  getClaimSignatureForSharedVote,
  voteId,
  transactionHash,
  recipientOverride,
  castedFrom,
}: {
  startOperationToken: () => StoriesOperationToken;
  resolveRequest: (params: {
    operationToken: StoriesOperationToken;
    requestSignature: ClaimSignatureRequest;
    voteId: string;
    transactionHash: string;
    recipientOverride: string;
    castedFrom: number;
    supersededMessage: string;
    verificationMessage?: string;
  }) => Promise<ClaimSignatureRequestResult>;
  getClaimSignatureForSharedVote: ClaimSignatureRequest;
  voteId: string;
  transactionHash: string;
  recipientOverride: string;
  castedFrom: number;
}): Promise<ClaimSignatureRequestResult> => {
  const operationToken = startOperationToken();
  return resolveRequest({
    operationToken,
    requestSignature: getClaimSignatureForSharedVote,
    voteId,
    transactionHash,
    recipientOverride,
    castedFrom,
    supersededMessage: 'Claim signature request superseded by newer operation',
  });
};

export const runLegacyClaimRewardFlow = async ({
  castHash,
  voteId,
  transactionHash,
  recipient,
  castedFrom,
  verifyShareAndGetClaimSignature,
  executeClaimReward,
  userAddress,
  shouldIgnoreOperationError,
  logStoriesError,
  setError,
}: {
  castHash: string;
  voteId: string;
  transactionHash: string;
  recipient: string;
  castedFrom: number;
  verifyShareAndGetClaimSignature: (
    castHash: string,
    voteId: string,
    transactionHash: string,
    recipientOverride: string,
    castedFrom: number
  ) => Promise<ClaimSignatureRequestResult>;
  executeClaimReward: (
    castHash: string,
    claimSignature: ClaimSignatureShape,
    day: number,
    recipient: string
  ) => Promise<void>;
  userAddress?: string;
  shouldIgnoreOperationError: (errorValue: unknown) => boolean;
  logStoriesError: (...args: unknown[]) => void;
  setError: (message: string | null) => void;
}): Promise<void> => {
  try {
    const { claimSignature, day } = await verifyShareAndGetClaimSignature(
      castHash,
      voteId,
      transactionHash,
      recipient,
      castedFrom
    );
    await executeClaimReward(castHash, claimSignature, day, recipient || userAddress!);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Claim reward failed';
    logStoriesError('❌ [ClaimReward] Claim reward failed:', error);
    if (!shouldIgnoreOperationError(error)) {
      setError(errorMessage);
    }
    throw error;
  }
};
