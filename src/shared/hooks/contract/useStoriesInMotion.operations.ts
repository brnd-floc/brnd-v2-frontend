import { formatUnits } from 'viem';
import {
  BRND_SEASON_2_CONFIG,
  BRND_SEASON_2_CONFIG_ABI,
  ERC20_ABI,
} from '@/config/contracts';
import type { StoriesOperationToken } from './useStoriesInMotion.async';
import { getStoriesErrorCause, getStoriesErrorMeta } from './useStoriesInMotion.errors';
import {
  asHexAddress,
  ensureVoteAuthData,
  isVoteAuthResponse,
} from './useStoriesInMotion.signatures';
import { validateBrandMutationInput, validateVoteInput } from './useStoriesInMotion.validation';
import type {
  BrandMutationInput,
  OnchainOperationFailure,
  StoriesOperation,
  StoriesWriteRunContext,
} from './useStoriesInMotion.types';

type WriteContractRequest = {
  address: `0x${string}`;
  abi: unknown;
  functionName: string;
  args?: readonly unknown[] | unknown[];
  chainId?: number;
};

type WriteContractFn = (request: WriteContractRequest) => Promise<unknown>;

type OnchainWriteRunParams = {
  operation: StoriesOperation;
  action: string;
  fallbackMessage: string;
  includeErrorMeta?: boolean;
  requireAuthorizedUserFid?: boolean;
  rethrowOnError?: boolean;
  run: (context: StoriesWriteRunContext) => Promise<void>;
};

type CreateOnchainWriteRunnerParams = {
  startOperationToken: () => StoriesOperationToken;
  prepareOnchainOperation: () => Promise<void>;
  getAuthorizedUserFid: () => number | null;
  setOperationLast: (operation: StoriesOperation) => void;
  handleOnchainOperationFailure: (error: OnchainOperationFailure) => void;
};

type RunVoteOperationParams = {
  brandIds: [number, number, number];
  userAddress?: string;
  userPowerLevel?: number;
  brndBalance?: bigint;
  brndAllowance?: bigint;
  isWalletAuthorized: boolean;
  userFid: number | null;
  prepareOnchainOperation: () => Promise<void>;
  startOperationToken: () => StoriesOperationToken;
  getVoteCost: (powerLevel?: number) => bigint;
  getVoteAuthorizationSignature: (
    voteBrandIds: [number, number, number],
    deadline: number
  ) => Promise<unknown>;
  requestVoteApproval: (
    voteBrandIds: [number, number, number],
    authData: string
  ) => Promise<void>;
  submitVoteTransaction: (
    voteBrandIds: [number, number, number],
    authData: string
  ) => Promise<void>;
  handleOnchainOperationFailure: (error: OnchainOperationFailure) => void;
  logStoriesError: (...args: unknown[]) => void;
  setError: (message: string | null) => void;
  voteFallbackMessage: string;
};

type BrandMutationOperationParams = {
  operation: 'createBrand' | 'updateBrand';
  input: BrandMutationInput;
  setPendingData: () => void;
  clearPendingData: () => void;
  writeRequest: () => Promise<unknown> | void;
  fallbackErrorMessage: string;
  featureAction: 'CreateBrand' | 'UpdateBrand';
  setError: (message: string | null) => void;
  switchToBase: () => Promise<void>;
  ensureConnectedWalletForBrandMutation: () => void;
  setOperationLast: (operation: StoriesOperation) => void;
  logStoriesError: (...args: unknown[]) => void;
};

type RunClaimExecutionOperationParams = {
  castHash: string;
  claimSignature: {
    signature: string;
    amount: string;
    deadline: number;
    nonce: number;
    canClaim: boolean;
  };
  day: number;
  recipient: string;
  runOnchainWriteOperation: (params: OnchainWriteRunParams) => Promise<number | null>;
  writeContract: WriteContractFn;
  claimFallbackMessage: string;
};

export const createOnchainWriteRunner =
  ({
    startOperationToken,
    prepareOnchainOperation,
    getAuthorizedUserFid,
    setOperationLast,
    handleOnchainOperationFailure,
  }: CreateOnchainWriteRunnerParams) =>
    async ({
      operation,
      action,
      fallbackMessage,
      includeErrorMeta = false,
      requireAuthorizedUserFid = false,
      rethrowOnError = false,
      run,
    }: OnchainWriteRunParams): Promise<number | null> => {
      const operationToken = startOperationToken();
      await prepareOnchainOperation();

      const currentUserFid = requireAuthorizedUserFid ? getAuthorizedUserFid() : null;
      if (requireAuthorizedUserFid && currentUserFid === null) {
        return null;
      }

      try {
        setOperationLast(operation);
        await run({ currentUserFid });
        return currentUserFid;
      } catch (error: unknown) {
        handleOnchainOperationFailure({
          operationToken,
          errorValue: error,
          fallbackMessage,
          action,
          includeErrorMeta,
        });
        if (rethrowOnError) {
          throw error;
        }
        return null;
      }
    };

export const runVoteOperation = async ({
  brandIds,
  userAddress,
  userPowerLevel,
  brndBalance,
  brndAllowance,
  isWalletAuthorized,
  userFid,
  prepareOnchainOperation,
  startOperationToken,
  getVoteCost,
  getVoteAuthorizationSignature,
  requestVoteApproval,
  submitVoteTransaction,
  handleOnchainOperationFailure,
  logStoriesError,
  setError,
  voteFallbackMessage,
}: RunVoteOperationParams): Promise<void> => {
  const operationToken = startOperationToken();
  await prepareOnchainOperation();

  const normalizedUserAddress = asHexAddress(userAddress);
  const voteInputError = validateVoteInput({ userAddress: normalizedUserAddress });
  if (voteInputError) {
    logStoriesError('❌ [Vote] Wallet not connected');
    setError(voteInputError);
    return;
  }

  try {
    const voteCost = getVoteCost(userPowerLevel);
    const balance = brndBalance || 0n;
    if (balance < voteCost) {
      const errorMessage = `Insufficient BRND balance. Need ${formatUnits(
        voteCost,
        18
      )} BRND, have ${formatUnits(balance, 18)} BRND`;
      logStoriesError('❌ [Vote]', errorMessage);
      throw new Error(errorMessage);
    }

    let authData = '0x';
    if (!isWalletAuthorized) {
      if (!userFid) {
        logStoriesError('❌ [Vote] User not authenticated');
        throw new Error('User not authenticated');
      }

      const deadline = Math.floor(Date.now() / 1000) + 3600;

      try {
        const voteAuth = await getVoteAuthorizationSignature(brandIds, deadline);
        if (!isVoteAuthResponse(voteAuth)) {
          throw new Error('Invalid vote authorization response');
        }
        authData = ensureVoteAuthData(voteAuth);
      } catch (authError: unknown) {
        const authErrorMessage =
          authError instanceof Error ? authError.message : 'Unknown authorization error';
        logStoriesError('❌ [Vote] Authorization request failed:', authError);
        logStoriesError('❌ [Vote] Auth error details:', {
          message: authErrorMessage,
          response:
            typeof authError === 'object' && authError !== null && 'response' in authError
              ? (authError as { response?: unknown }).response
              : undefined,
          status:
            typeof authError === 'object' && authError !== null && 'status' in authError
              ? (authError as { status?: unknown }).status
              : undefined,
        });
        throw new Error(`Authorization failed: ${authErrorMessage}`);
      }
    }

    const allowance = brndAllowance || 0n;
    if (allowance < voteCost) {
      await requestVoteApproval(brandIds, authData);
      return;
    }

    await submitVoteTransaction(brandIds, authData);
  } catch (error: unknown) {
    handleOnchainOperationFailure({
      operationToken,
      errorValue: error,
      fallbackMessage: voteFallbackMessage,
      action: 'Vote',
      includeErrorMeta: true,
    });
  }
};

export const runBrandMutationOperation = async ({
  operation,
  input,
  setPendingData,
  clearPendingData,
  writeRequest,
  fallbackErrorMessage,
  featureAction,
  setError,
  switchToBase,
  ensureConnectedWalletForBrandMutation,
  setOperationLast,
  logStoriesError,
}: BrandMutationOperationParams): Promise<unknown> => {
  setError(null);
  await switchToBase();
  ensureConnectedWalletForBrandMutation();

  const brandValidationError = validateBrandMutationInput({
    brandId: input.brandId,
    handle: input.handle,
    metadataHash: input.metadataHash,
    fid: input.fid,
    walletAddress: input.walletAddress,
    requireBrandId: operation === 'updateBrand',
  });
  if (brandValidationError) {
    setError(brandValidationError);
    throw new Error(brandValidationError);
  }

  try {
    setOperationLast(operation);
    setPendingData();
    return await Promise.resolve(writeRequest());
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : fallbackErrorMessage;
    logStoriesError(`❌ [${featureAction}] Transaction failed:`, error);
    logStoriesError(`❌ [${featureAction}] Error details:`, {
      ...getStoriesErrorMeta(error),
      cause: getStoriesErrorCause(error),
    });
    setError(errorMessage);
    clearPendingData();
    throw error;
  }
};

export const runClaimExecutionOperation = async ({
  castHash,
  claimSignature,
  day,
  recipient,
  runOnchainWriteOperation,
  writeContract,
  claimFallbackMessage,
}: RunClaimExecutionOperationParams): Promise<void> => {
  await runOnchainWriteOperation({
    operation: 'claimReward',
    action: 'ClaimReward',
    fallbackMessage: claimFallbackMessage,
    requireAuthorizedUserFid: true,
    rethrowOnError: true,
    run: async ({ currentUserFid }) => {
      const args = [
        recipient,
        claimSignature.amount,
        currentUserFid as number,
        day,
        castHash,
        claimSignature.deadline,
        claimSignature.signature,
      ];

      await writeContract({
        address: BRND_SEASON_2_CONFIG.CONTRACT,
        abi: BRND_SEASON_2_CONFIG_ABI,
        functionName: 'claimReward',
        args,
        chainId: BRND_SEASON_2_CONFIG.CHAIN_ID,
      });
    },
  });
};

export const buildVoteWriters = ({
  writeContract,
  setOperationLast,
  setPendingVoteBrandIds,
  setPendingVoteAuthData,
}: {
  writeContract: WriteContractFn;
  setOperationLast: (operation: StoriesOperation) => void;
  setPendingVoteBrandIds: (brandIds: [number, number, number]) => void;
  setPendingVoteAuthData: (authData: string) => void;
}) => {
  const submitVoteTransaction = async (
    brandIds: [number, number, number],
    authData: string
  ): Promise<void> => {
    setOperationLast('vote');
    await writeContract({
      address: BRND_SEASON_2_CONFIG.CONTRACT,
      abi: BRND_SEASON_2_CONFIG_ABI,
      functionName: 'vote',
      args: [brandIds, authData],
      chainId: BRND_SEASON_2_CONFIG.CHAIN_ID,
    });
  };

  const requestVoteApproval = async (
    brandIds: [number, number, number],
    authData: string
  ): Promise<void> => {
    setPendingVoteBrandIds(brandIds);
    setPendingVoteAuthData(authData);
    setOperationLast('approve');
    await writeContract({
      address: BRND_SEASON_2_CONFIG.BRND_TOKEN,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [BRND_SEASON_2_CONFIG.CONTRACT, 11111000000000000000000n],
    });
  };

  return { submitVoteTransaction, requestVoteApproval };
};
