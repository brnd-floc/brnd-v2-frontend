// src/shared/hooks/contract/useStoriesInMotion.ts
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "@/shared/config/wagmi";
import { parseUnits, formatUnits } from "viem";

import {
  BRND_SEASON_2_CONFIG,
  BRND_SEASON_2_CONFIG_ABI,
  ERC20_ABI,
} from "@/config/contracts";
import { useAuth } from "@/shared/hooks/auth";
import { logFeatureError } from "@/shared/utils/logger";
import {
  requestAuthorizationSignature,
  requestClaimRewardSignature,
  requestClaimSignatureForSharedVote,
  requestLevelUpSignature,
  requestPowerLevelInfo,
  requestStakeInfo,
  requestVoteAuthorizationSignature,
  StoriesApiResult,
} from "./useStoriesInMotion.api";
import {
  retryAsync,
  StoriesOperationToken,
  withTimeout,
} from "./useStoriesInMotion.async";
import {
  STORIES_BACKEND_TIMEOUT_MS,
  STORIES_TRANSIENT_RETRY_POLICY,
} from "./useStoriesInMotion.constants";
import {
  isAbortLikeError,
  isSupersededOperationError,
  getStoriesErrorMessage,
  getStoriesErrorMeta,
} from "./useStoriesInMotion.errors";
import {
  getEncodedAuthData,
} from "./useStoriesInMotion.signatures";
import {
  buildTxCallbackData,
  deriveWalletAuthorizedState,
  getStoriesOperationFlags,
  shouldHandleStoriesTxSuccess,
} from "./useStoriesInMotion.txState";
import {
  validateWalletAuthorizedInput,
} from "./useStoriesInMotion.validation";
import {
  type ClaimSignatureRequest,
  type ConfirmOperationHandlers,
  type ContractUserInfoTuple,
  type FailedOperationHandlers,
  type OnchainOperationFailure,
  type PowerLevelInfo,
  type StakeInfo,
  type StoriesOperation,
  STORIES_FALLBACK_ERRORS,
  type TxCallbackData,
  type UserInfo,
} from "./useStoriesInMotion.types";
import {
  buildVoteWriters,
  createOnchainWriteRunner,
  runBrandMutationOperation,
  runClaimExecutionOperation,
  runVoteOperation,
} from "./useStoriesInMotion.operations";
import {
  buildConfirmedOperationHandlers,
  buildFailedOperationHandlers,
  findFirstTopicLog,
  handleWriteError,
} from "./useStoriesInMotion.handlers";
import {
  getClaimSignatureForSharedVoteCoordinator,
  resolveClaimSignatureRequest,
  runLegacyClaimRewardFlow,
  verifyShareAndGetClaimSignatureCoordinator,
} from "./useStoriesInMotion.claim";
import { scheduleApprovedVoteRetry } from "./useStoriesInMotion.voteRetry";

export type {
  AuthorizeWalletParams,
  ClaimRewardParams,
  LevelUpParams,
  PowerLevelInfo,
  StakeInfo,
  UserInfo,
  VoteParams,
} from "./useStoriesInMotion.types";

export const useStoriesInMotion = (
  onLevelUpSuccess?: (txData: TxCallbackData) => void,
  onVoteSuccess?: (txData: TxCallbackData) => void,
  onClaimSuccess?: (txData: TxCallbackData) => void,
  onBrandCreateSuccess?: (txData: TxCallbackData) => void,
  onBrandUpdateSuccess?: (txData: TxCallbackData) => void
) => {
  const unwrapApiResult = <T>(result: StoriesApiResult<T>): T => {
    if (result.ok) {
      return result.data;
    }
    throw new Error(result.errorMessage);
  };

  const logStoriesError = useCallback((...args: unknown[]) => {
    if (args.length === 0) return;
    const [error, ...rest] = args;
    logFeatureError({
      feature: "stories_in_motion",
      action: "runtime",
      error,
      meta: rest.length > 0 ? { details: rest } : undefined,
    });
  }, []);

  const { address: userAddress, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const {
    writeContract,
    isPending: isWritePending,
    data: hash,
    error: writeError,
  } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });

  const [error, setError] = useState<string | null>(null);
  const [isWalletAuthorized, setIsWalletAuthorized] = useState(false);
  const [lastOperation, setLastOperation] = useState<StoriesOperation | null>(
    null
  );
  const [pendingVoteBrandIds, setPendingVoteBrandIds] = useState<
    [number, number, number] | null
  >(null);
  const [pendingVoteAuthData, setPendingVoteAuthData] = useState<string | null>(
    null
  );
  const [pendingBrandCreateData, setPendingBrandCreateData] = useState<{
    handle: string;
    metadataHash: string;
    fid: number;
    walletAddress: string;
  } | null>(null);
  const [pendingBrandUpdateData, setPendingBrandUpdateData] = useState<{
    brandId: number;
    metadataHash: string;
    fid: number;
    walletAddress: string;
  } | null>(null);
  const isMountedRef = useRef(true);
  const operationTokenRef = useRef<StoriesOperationToken>({ id: 0 });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startOperationToken = useCallback(() => {
    operationTokenRef.current = { id: operationTokenRef.current.id + 1 };
    return operationTokenRef.current;
  }, []);

  const isOperationActive = useCallback((token: StoriesOperationToken) => {
    return isMountedRef.current && token.id === operationTokenRef.current.id;
  }, []);

  const clearPendingVoteData = useCallback(() => {
    setPendingVoteBrandIds(null);
    setPendingVoteAuthData(null);
  }, []);

  const setOperationLast = useCallback((operation: StoriesOperation) => {
    setLastOperation(operation);
  }, []);

  const clearOperationState = useCallback(
    (operation: StoriesOperation) => {
      switch (operation) {
        case "approve":
        case "vote":
          clearPendingVoteData();
          break;
        case "createBrand":
          setPendingBrandCreateData(null);
          break;
        case "updateBrand":
          setPendingBrandUpdateData(null);
          break;
        default:
          break;
      }
    },
    [clearPendingVoteData]
  );

  const shouldIgnoreOperationError = useCallback(
    (errorValue: unknown) =>
      isAbortLikeError(errorValue) || isSupersededOperationError(errorValue),
    []
  );

  const setOperationErrorIfActive = useCallback(
    (
      operationToken: StoriesOperationToken,
      errorValue: unknown,
      fallbackMessage: string
    ) => {
      if (
        isOperationActive(operationToken) &&
        !shouldIgnoreOperationError(errorValue)
      ) {
        setError(getStoriesErrorMessage(errorValue, fallbackMessage));
      }
    },
    [isOperationActive, shouldIgnoreOperationError]
  );

  const handleOnchainOperationFailure = useCallback(
    ({
      operationToken,
      errorValue,
      fallbackMessage,
      action,
      includeErrorMeta = false,
    }: OnchainOperationFailure) => {
      logStoriesError(`❌ [${action}] Operation failed:`, errorValue);
      if (includeErrorMeta) {
        logStoriesError(
          `❌ [${action}] Error details:`,
          getStoriesErrorMeta(errorValue)
        );
      }
      setOperationErrorIfActive(operationToken, errorValue, fallbackMessage);
    },
    [logStoriesError, setOperationErrorIfActive]
  );

  const ensureConnectedWalletForBrandMutation = useCallback(() => {
    if (!userAddress) {
      setError("Wallet not connected");
      throw new Error("Wallet not connected");
    }
  }, [userAddress]);

  // Get FID from auth context
  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;
  const userPowerLevel = authData?.brndPowerLevel;

  const resolveClaimSignatureRequestWrapper = useCallback(
    (params: {
      operationToken: StoriesOperationToken;
      requestSignature: ClaimSignatureRequest;
      voteId: string;
      transactionHash: string;
      recipientOverride: string;
      castedFrom: number;
      supersededMessage: string;
      verificationMessage?: string;
    }) =>
      resolveClaimSignatureRequest({
        ...params,
        setError,
        userAddress,
        userFid,
        assertActiveOperation: (operationToken, message) => {
          if (!isOperationActive(operationToken)) {
            throw new Error(message);
          }
        },
      }),
    [isOperationActive, setError, userAddress, userFid]
  );

  const getAuthorizedUserFid = useCallback(() => {
    const authValidationError = validateWalletAuthorizedInput({
      userAddress,
      userFid,
    });
    if (authValidationError) {
      setError(authValidationError);
      return null;
    }

    return userFid as number;
  }, [userAddress, userFid]);

  // Check if user is on correct network
  const isCorrectNetwork = chainId === BRND_SEASON_2_CONFIG.CHAIN_ID;

  // Get user info from contract (V5 uses getUserInfoByWallet for backwards compatibility)
  const {
    data: userInfo,
    isLoading: isLoadingUserInfo,
    refetch: refetchUserInfo,
  } = useReadContract({
    address: BRND_SEASON_2_CONFIG.CONTRACT,
    abi: BRND_SEASON_2_CONFIG_ABI,
    functionName: "getUserInfo",
    args: userFid ? [BigInt(userFid)] : undefined,
  });

  // Get BRND balance
  const {
    data: brndBalance,
    isLoading: isLoadingBrndBalance,
    refetch: refetchBrndBalance,
  } = useReadContract({
    address: BRND_SEASON_2_CONFIG.BRND_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && isCorrectNetwork,
      // Refetch when address or network changes
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Minimize RPC calls
    },
  });

  // Track previous address to only refetch when it actually changes
  const prevAddressRef = useRef<string | undefined>(undefined);

  // Explicitly refetch balance when wallet address actually changes (not on every render)
  useEffect(() => {
    // Only refetch if:
    // 1. We have an address
    // 2. We're on the correct network
    // 3. The address actually changed (not just a re-render)
    if (
      userAddress &&
      isCorrectNetwork &&
      isConnected &&
      userAddress !== prevAddressRef.current
    ) {
      prevAddressRef.current = userAddress;
      // Refetch balance when address changes
      refetchBrndBalance();
    } else if (!userAddress) {
      // Reset ref when disconnected
      prevAddressRef.current = undefined;
    }
  }, [userAddress, isConnected, isCorrectNetwork, refetchBrndBalance]);

  // Get BRND allowance for contract
  const { data: brndAllowance, refetch: refetchAllowance } = useReadContract({
    address: BRND_SEASON_2_CONFIG.BRND_TOKEN,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress
      ? [userAddress, BRND_SEASON_2_CONFIG.CONTRACT]
      : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // Check if voted today (V5 uses FID instead of wallet address)
  const { data: hasVotedToday, refetch: refetchVotedToday } = useReadContract({
    address: BRND_SEASON_2_CONFIG.CONTRACT,
    abi: BRND_SEASON_2_CONFIG_ABI,
    functionName: "hasVotedToday",
    args: userFid ? [userFid, Math.floor(Date.now() / 86400000)] : undefined,
    query: {
      enabled: !!userFid && isCorrectNetwork,
    },
  });

  const refreshStoriesReads = useCallback(() => {
    refetchUserInfo();
    refetchBrndBalance();
    refetchAllowance();
    refetchVotedToday();
  }, [refetchUserInfo, refetchBrndBalance, refetchAllowance, refetchVotedToday]);

  // Get vote cost based on power level (V5 contract logic)
  const getVoteCost = useCallback((powerLevel?: number): bigint => {
    if (powerLevel === undefined || powerLevel === null) return 0n;
    if (powerLevel === 0) return parseUnits("100", 18); // BASE_VOTE_COST
    if (powerLevel === 1) return parseUnits("150", 18); // LEVEL_1_VOTE_COST
    return parseUnits((powerLevel * 100).toString(), 18);
  }, []);

  // Check if wallet is authorized (has FID linked)
  const { data: authorizedFid, refetch: refetchAuthorizedFid } =
    useReadContract({
      address: BRND_SEASON_2_CONFIG.CONTRACT,
      abi: BRND_SEASON_2_CONFIG_ABI,
      functionName: "authorizedFidOf",
      args: userAddress ? [userAddress] : undefined,
      query: {
        enabled: !!userAddress && isCorrectNetwork,
      },
    });

  // Switch to Base network
  const switchToBase = useCallback(async () => {
    if (!isCorrectNetwork) {
      try {
        await switchChain({ chainId: BRND_SEASON_2_CONFIG.CHAIN_ID });
      } catch (error) {
        logStoriesError("Failed to switch network:", error);
        setError("Please switch to Base network");
        throw error;
      }
    }
  }, [isCorrectNetwork, logStoriesError, switchChain]);

  const prepareOnchainOperation = useCallback(async () => {
    setError(null);
    await switchToBase();
  }, [switchToBase]);

  const runOnchainWriteOperationImpl = useMemo(
    () =>
      createOnchainWriteRunner({
        startOperationToken,
        prepareOnchainOperation,
        getAuthorizedUserFid,
        setOperationLast,
        handleOnchainOperationFailure,
      }),
    [
      startOperationToken,
      prepareOnchainOperation,
      getAuthorizedUserFid,
      setOperationLast,
      handleOnchainOperationFailure,
    ]
  );

  const runOnchainWriteOperation = useCallback(
    (params: {
      operation: StoriesOperation;
      action: string;
      fallbackMessage: string;
      includeErrorMeta?: boolean;
      requireAuthorizedUserFid?: boolean;
      rethrowOnError?: boolean;
      run: (context: { currentUserFid: number | null }) => Promise<void>;
    }) =>
      runOnchainWriteOperationImpl(params),
    [
      runOnchainWriteOperationImpl,
    ]
  );

  const runStoriesApiRequest = useCallback(
    async <T,>({
      request,
      timeoutMs = STORIES_BACKEND_TIMEOUT_MS,
      timeoutLabel,
      useTransientRetry = false,
    }: {
      request: () => Promise<StoriesApiResult<T>>;
      timeoutMs?: number;
      timeoutLabel: string;
      useTransientRetry?: boolean;
    }): Promise<T> => {
      const execute = async () =>
        withTimeout(request(), timeoutMs, timeoutLabel);

      const result = useTransientRetry
        ? await retryAsync(execute, STORIES_TRANSIENT_RETRY_POLICY)
        : await execute();

      return unwrapApiResult(result);
    },
    []
  );

  // Backend API adapters
  const getAuthorizationSignature = useCallback(
    (deadline: number) =>
      runStoriesApiRequest({
        request: () => requestAuthorizationSignature({ userAddress, deadline }),
        timeoutLabel: "authorize-wallet",
      }),
    [runStoriesApiRequest, userAddress]
  );

  const getLevelUpSignature = useCallback(
    (newLevel: number, deadline: number) =>
      runStoriesApiRequest({
        request: () =>
          requestLevelUpSignature({ userAddress, newLevel, deadline }),
        timeoutLabel: "level-up-signature",
      }),
    [runStoriesApiRequest, userAddress]
  );

  const getVoteAuthorizationSignature = useCallback(
    (brandIds: [number, number, number], deadline: number) =>
      runStoriesApiRequest({
        request: () =>
          requestVoteAuthorizationSignature({
            userAddress,
            brandIds,
            deadline,
          }),
        timeoutMs: STORIES_TRANSIENT_RETRY_POLICY.timeoutMs,
        timeoutLabel: "authorize-vote",
        useTransientRetry: true,
      }),
    [runStoriesApiRequest, userAddress]
  );

  const getClaimRewardSignature = useCallback(
    (
      castHash: string,
      voteId: string,
      recipientAddress: string,
      transactionHash: string,
      castedFrom: number
    ) =>
      runStoriesApiRequest({
        request: () =>
          requestClaimRewardSignature({
            userAddress,
            castHash,
            voteId,
            recipientAddress,
            transactionHash,
            castedFrom,
          }),
        timeoutMs: STORIES_TRANSIENT_RETRY_POLICY.timeoutMs,
        timeoutLabel: "verify-share",
        useTransientRetry: true,
      }),
    [runStoriesApiRequest, userAddress]
  );

  const getClaimSignatureForSharedVote = useCallback(
    (
      voteId: string,
      recipientAddress: string,
      transactionHash: string,
      castedFrom: number
    ) =>
      runStoriesApiRequest({
        request: () =>
          requestClaimSignatureForSharedVote({
            userAddress,
            voteId,
            recipientAddress,
            transactionHash,
            castedFrom,
          }),
        timeoutMs: STORIES_TRANSIENT_RETRY_POLICY.timeoutMs,
        timeoutLabel: "verify-share-shared-vote",
        useTransientRetry: true,
      }),
    [runStoriesApiRequest, userAddress]
  );

  const getPowerLevelInfo = useCallback(
    (fid: number): Promise<PowerLevelInfo> =>
      runStoriesApiRequest({
        request: () => requestPowerLevelInfo(fid),
        timeoutLabel: "power-level-info",
      }),
    [runStoriesApiRequest]
  );

  const getStakeInfo = useCallback(
    (fid: number): Promise<StakeInfo> =>
      runStoriesApiRequest({
        request: () => requestStakeInfo(fid),
        timeoutLabel: "stake-info",
      }),
    [runStoriesApiRequest]
  );

  // Note: authorizeWallet function removed - the contract doesn't have a public authorizeWallet function.
  // Authorization happens automatically inside vote() and levelUpBrndPower() via the internal _authorizeWallet function.

  // Level up power
  const levelUpBrndPower = useCallback(
    async (targetLevel: number) => {
      await runOnchainWriteOperation({
        operation: "levelup",
        action: "LevelUp",
        fallbackMessage: STORIES_FALLBACK_ERRORS.LEVEL_UP,
        requireAuthorizedUserFid: true,
        run: async ({ currentUserFid }) => {
          const deadline = Math.floor(Date.now() / 1000) + 3600;
          const levelUpData = await getLevelUpSignature(targetLevel, deadline);

          if (!levelUpData.validation.eligible) {
            throw new Error(
              `Cannot level up: ${
                levelUpData.validation.reason || "Requirements not met"
              }`
            );
          }

          const authDeadline = Math.floor(Date.now() / 1000) + 3600;
          const authResponse = await getAuthorizationSignature(authDeadline);
          const authData = getEncodedAuthData(authResponse);

          await writeContract({
            address: BRND_SEASON_2_CONFIG.CONTRACT,
            abi: BRND_SEASON_2_CONFIG_ABI,
            functionName: "levelUpBrndPower",
            args: [
              currentUserFid as number,
              targetLevel,
              deadline,
              levelUpData.signature,
              authData,
            ],
            chainId: BRND_SEASON_2_CONFIG.CHAIN_ID,
          });
        },
      });
    },
    [
      getLevelUpSignature,
      getAuthorizationSignature,
      runOnchainWriteOperation,
      writeContract,
    ]
  );

  const { submitVoteTransaction, requestVoteApproval } = useMemo(
    () =>
      buildVoteWriters({
        writeContract: writeContract as (request: {
          address: `0x${string}`;
          abi: unknown;
          functionName: string;
          args?: readonly unknown[] | unknown[];
          chainId?: number;
        }) => Promise<unknown>,
        setOperationLast,
        setPendingVoteBrandIds,
        setPendingVoteAuthData,
      }),
    [writeContract, setOperationLast, setPendingVoteBrandIds, setPendingVoteAuthData]
  );

  // Vote function - Updated for V4 contract
  const vote = useCallback(
    async (brandIds: [number, number, number]) => {
      await runVoteOperation({
        brandIds,
        userAddress,
        userPowerLevel,
        brndBalance: brndBalance as bigint | undefined,
        brndAllowance: brndAllowance as bigint | undefined,
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
        voteFallbackMessage: STORIES_FALLBACK_ERRORS.VOTE,
      });
    },
    [
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
    ]
  );

  // Get reward amount for a power level
  const getRewardAmount = useCallback(
    async (powerLevel: number): Promise<string> => {
      try {
        const rewardAmount = await readContract(config, {
          address: BRND_SEASON_2_CONFIG.CONTRACT,
          abi: BRND_SEASON_2_CONFIG_ABI,
          functionName: "getRewardAmount",
          args: [powerLevel],
        });
        return formatUnits(rewardAmount as bigint, 18);
      } catch (error) {
        logStoriesError("Failed to get reward amount:", error);
        return "0";
      }
    },
    [logStoriesError]
  );

  // Get brand information
  const getBrand = useCallback(async (brandId: number) => {
    try {
      const brandInfo = await readContract(config, {
        address: BRND_SEASON_2_CONFIG.CONTRACT,
        abi: BRND_SEASON_2_CONFIG_ABI,
        functionName: "getBrand",
        args: [brandId],
      });
      return brandInfo;
    } catch (error) {
      logStoriesError("Failed to get brand info:", error);
      return null;
    }
  }, [logStoriesError]);

  // Create brand on-chain
  const createBrandOnChain = useCallback(
    async (
      handle: string,
      metadataHash: string,
      fid: number,
      walletAddress: string
    ) =>
      runBrandMutationOperation({
        operation: "createBrand",
        input: { handle, metadataHash, fid, walletAddress },
        setPendingData: () =>
          setPendingBrandCreateData({
            handle,
            metadataHash,
            fid,
            walletAddress,
          }),
        clearPendingData: () => setPendingBrandCreateData(null),
        writeRequest: () =>
          writeContract({
            address: BRND_SEASON_2_CONFIG.CONTRACT as `0x${string}`,
            abi: BRND_SEASON_2_CONFIG_ABI,
            functionName: "createBrand",
            args: [handle, metadataHash, BigInt(fid), walletAddress as `0x${string}`],
            chainId: BRND_SEASON_2_CONFIG.CHAIN_ID,
          }),
        fallbackErrorMessage: "Brand creation failed",
        featureAction: "CreateBrand",
        setError,
        switchToBase,
        ensureConnectedWalletForBrandMutation,
        setOperationLast,
        logStoriesError,
      }),
    [
      ensureConnectedWalletForBrandMutation,
      logStoriesError,
      setOperationLast,
      setError,
      switchToBase,
      writeContract,
    ]
  );

  const updateBrandOnChain = useCallback(
    async (
      brandId: number,
      metadataHash: string,
      fid: number,
      walletAddress: string
    ) =>
      runBrandMutationOperation({
        operation: "updateBrand",
        input: { brandId, metadataHash, fid, walletAddress },
        setPendingData: () =>
          setPendingBrandUpdateData({
            brandId,
            metadataHash,
            fid,
            walletAddress,
          }),
        clearPendingData: () => setPendingBrandUpdateData(null),
        writeRequest: () =>
          writeContract({
            address: BRND_SEASON_2_CONFIG.CONTRACT as `0x${string}`,
            abi: BRND_SEASON_2_CONFIG_ABI,
            functionName: "updateBrand",
            args: [
              brandId as number,
              metadataHash,
              BigInt(fid),
              walletAddress as `0x${string}`,
            ],
            chainId: BRND_SEASON_2_CONFIG.CHAIN_ID,
          }),
        fallbackErrorMessage: "Brand update failed",
        featureAction: "UpdateBrand",
        setError,
        switchToBase,
        ensureConnectedWalletForBrandMutation,
        setOperationLast,
        logStoriesError,
      }),
    [
      ensureConnectedWalletForBrandMutation,
      logStoriesError,
      setOperationLast,
      setError,
      switchToBase,
      writeContract,
    ]
  );

  // Verify share and get claim signature (does not execute transaction)
  const verifyShareAndGetClaimSignature = useCallback(
    async (
      castHash: string,
      voteId: string,
      transactionHash: string,
      recipientOverride: string,
      castedFrom: number
    ) =>
      verifyShareAndGetClaimSignatureCoordinator({
        startOperationToken,
        resolveRequest: resolveClaimSignatureRequestWrapper,
        castHash,
        voteId,
        transactionHash,
        recipientOverride,
        castedFrom,
        getClaimRewardSignature,
      }),
    [startOperationToken, resolveClaimSignatureRequestWrapper, getClaimRewardSignature]
  );

  // Get claim signature for already shared vote (without castHash)
  // Note: voteId is always a UUID string from the vote data
  const getClaimSignatureForSharedVoteWrapper = useCallback(
    async (
      voteId: string,
      transactionHash: string,
      recipientOverride: string,
      castedFrom: number
    ) =>
      getClaimSignatureForSharedVoteCoordinator({
        startOperationToken,
        resolveRequest: resolveClaimSignatureRequestWrapper,
        getClaimSignatureForSharedVote,
        voteId,
        transactionHash,
        recipientOverride,
        castedFrom,
      }),
    [getClaimSignatureForSharedVote, startOperationToken, resolveClaimSignatureRequestWrapper]
  );

  // Execute claim reward transaction (after verification)
  const executeClaimReward = useCallback(
    async (
      castHash: string,
      claimSignature: {
        signature: string;
        amount: string;
        deadline: number;
        nonce: number;
        canClaim: boolean;
      },
      day: number,
      recipient: string
    ) => {
      await runClaimExecutionOperation({
        castHash,
        claimSignature,
        day,
        recipient,
        runOnchainWriteOperation,
        writeContract: writeContract as (request: {
          address: `0x${string}`;
          abi: unknown;
          functionName: string;
          args?: readonly unknown[] | unknown[];
          chainId?: number;
        }) => Promise<unknown>,
        claimFallbackMessage: STORIES_FALLBACK_ERRORS.CLAIM_REWARD,
      });
    },
    [runOnchainWriteOperation, writeContract]
  );

  // Claim reward with signature (legacy - combines verification and execution)
  // Contract signature: claimReward(address recipient, uint256 amount, uint256 fid, uint256 day, string castHash, uint256 deadline, bytes signature)
  const claimReward = useCallback(
    async (
      castHash: string,
      voteId: string,
      transactionHash: string,
      recipient: string,
      castedFrom: number
    ) =>
      runLegacyClaimRewardFlow({
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
      }),
    [
      verifyShareAndGetClaimSignature,
      executeClaimReward,
      userAddress,
      shouldIgnoreOperationError,
      logStoriesError,
    ]
  );

  const handleApprovedOperation = useCallback(() => {
    scheduleApprovedVoteRetry({
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
    });
  }, [
    pendingVoteBrandIds,
    refetchAllowance,
    pendingVoteAuthData,
    isWalletAuthorized,
    userFid,
    getVoteAuthorizationSignature,
    submitVoteTransaction,
    clearPendingVoteData,
    startOperationToken,
    isOperationActive,
    logStoriesError,
  ]);

  const handleVoteOperationSuccess = useCallback(
    (txData: TxCallbackData) => {
      clearPendingVoteData();
      setTimeout(() => {
        refetchUserInfo();
        refetchAuthorizedFid();
      }, 1000);

      onVoteSuccess?.(txData);
    },
    [clearPendingVoteData, refetchUserInfo, refetchAuthorizedFid, onVoteSuccess]
  );

  const handleCreateBrandSuccess = useCallback(
    (txData: TxCallbackData) => {
      const brandCreatedEvent = findFirstTopicLog(receipt?.logs);
      const brandCreateTxData = {
        ...txData,
        brandData: pendingBrandCreateData,
        event: brandCreatedEvent,
      };
      setPendingBrandCreateData(null);
      onBrandCreateSuccess?.(brandCreateTxData);
    },
    [receipt?.logs, pendingBrandCreateData, onBrandCreateSuccess]
  );

  const handleUpdateBrandSuccess = useCallback(
    (txData: TxCallbackData) => {
      const brandUpdatedEvent = findFirstTopicLog(receipt?.logs);
      const brandUpdateTxData = {
        ...txData,
        brandData: pendingBrandUpdateData,
        event: brandUpdatedEvent,
      };
      setPendingBrandUpdateData(null);
      onBrandUpdateSuccess?.(brandUpdateTxData);
    },
    [receipt?.logs, pendingBrandUpdateData, onBrandUpdateSuccess]
  );

  const confirmedOperationHandlers = useMemo<ConfirmOperationHandlers>(
    () =>
      buildConfirmedOperationHandlers({
        onLevelUpSuccess,
        onClaimSuccess,
        handleApprovedOperation,
        handleVoteOperationSuccess,
        handleCreateBrandSuccess,
        handleUpdateBrandSuccess,
      }),
    [
      handleApprovedOperation,
      handleVoteOperationSuccess,
      handleCreateBrandSuccess,
      handleUpdateBrandSuccess,
      onClaimSuccess,
      onLevelUpSuccess,
    ]
  );

  const handleConfirmedOperation = useCallback(
    (operation: StoriesOperation, txData: TxCallbackData) => {
      const handler = confirmedOperationHandlers[operation];
      handler?.(txData);
    },
    [confirmedOperationHandlers]
  );

  const failedOperationHandlers = useMemo<FailedOperationHandlers>(
    () => buildFailedOperationHandlers({ clearOperationState }),
    [clearOperationState]
  );

  const handleOperationWriteError = useCallback(
    (operation: StoriesOperation, errorMessage: string) => {
      handleWriteError({
        operation,
        errorMessage,
        logStoriesError,
        failedOperationHandlers,
        setLastOperation,
        setError,
      });
    },
    [failedOperationHandlers, logStoriesError]
  );

  // Handle transaction errors - clear operation state on error
  useEffect(() => {
    if (writeError && lastOperation) {
      handleOperationWriteError(
        lastOperation,
        writeError.message || "Transaction failed"
      );
    }
  }, [writeError, lastOperation, handleOperationWriteError]);

  // Handle transaction success
  useEffect(() => {
    if (
      shouldHandleStoriesTxSuccess({
        isConfirmed,
        hasReceipt: Boolean(receipt),
        lastOperation,
      }) &&
      receipt &&
      lastOperation
    ) {
      const txData = buildTxCallbackData({
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        operation: lastOperation,
      });

      refreshStoriesReads();

      handleConfirmedOperation(lastOperation, txData);

      setLastOperation(null);
    }
  }, [
    isConfirmed,
    receipt,
    lastOperation,
    handleConfirmedOperation,
    refreshStoriesReads,
  ]);

  const operationFlags = useMemo(
    () => getStoriesOperationFlags(lastOperation),
    [lastOperation]
  );

  // Parse user info
  const parsedUserInfo: UserInfo | null = useMemo(() => {
    if (!userInfo) return null;
    const tuple = userInfo as ContractUserInfoTuple;
    return {
      fid: Number(tuple[0]),
      brndPowerLevel: Number(tuple[1]),
      lastVoteDay: Number(tuple[2]),
      totalVotes: Number(tuple[3]),
    };
  }, [userInfo]);

  // Update authorization status based on contract data
  // Check if the wallet is authorized by comparing FID from auth context with contract
  useEffect(() => {
    setIsWalletAuthorized(
      deriveWalletAuthorizedState({
        authorizedFid: authorizedFid as bigint | undefined,
        userInfoFid: parsedUserInfo?.fid || 0,
        userFid,
      })
    );
  }, [authorizedFid, parsedUserInfo, userFid]);

  return {
    // Connection state
    userAddress,
    isConnected,
    isCorrectNetwork,
    isWalletAuthorized,
    userFid,

    // Contract state
    userInfo: parsedUserInfo,
    brndBalance: brndBalance ? formatUnits(brndBalance as bigint, 18) : "0",
    brndAllowance: brndAllowance
      ? formatUnits(brndAllowance as bigint, 18)
      : "0",
    hasVotedToday: Boolean(hasVotedToday),

    // Transaction state
    isPending: isWritePending,
    isConfirming,
    isConfirmed,
    hash,
    receipt,
    error: error || (writeError ? writeError.message : null),
    isApproving: operationFlags.isApproving,
    isVoting: operationFlags.isVoting,
    isCreatingBrand: operationFlags.isCreatingBrand,
    isUpdatingBrand: operationFlags.isUpdatingBrand,

    // Loading states
    isLoadingUserInfo,
    isLoadingBrndBalance,

    // Actions
    switchToBase,
    // Note: authorizeWallet removed - authorization happens automatically in vote() and levelUpBrndPower()
    levelUpBrndPower,
    vote,
    claimReward,
    verifyShareAndGetClaimSignature,
    getClaimSignatureForSharedVote: getClaimSignatureForSharedVoteWrapper,
    executeClaimReward,
    getVoteCost,
    getRewardAmount,
    getBrand,
    createBrandOnChain,
    updateBrandOnChain,

    // Backend integration
    getPowerLevelInfo,
    getStakeInfo,
    getVoteAuthorizationSignature,

    // Refresh functions
    refreshData: () => {
      refreshStoriesReads();
      refetchAuthorizedFid();
    },
  };
};
