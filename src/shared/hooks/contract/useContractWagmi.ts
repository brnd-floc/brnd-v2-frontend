// src/shared/hooks/contract/useContractWagmi.ts
import { useCallback, useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";

import {
  BRND_STAKING_CONFIG,
  ERC20_ABI,
  ERC4626_ABI,
} from "@/config/contracts";

// BRND Staking parameters
export interface StakeBrndParams {
  amount: string; // Human-readable amount like "100" or "100.5"
}

export interface WithdrawBrndParams {
  shares: string; // Amount in BRND equivalent (will be converted to vault shares)
}

export const useContractWagmi = (
  onStakeSuccess?: (txData: any) => void,
  onWithdrawSuccess?: (txData: any) => void
) => {
  const { address: userAddress, isConnected } = useAccount();
  const {
    writeContract,
    isPending: isWritePending,
    data: hash,
    error: writeError,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        // Transaction successful
      },
      onError: () => {
        // Transaction failed
      },
    },
  });
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [lastStakeParams, setLastStakeParams] =
    useState<StakeBrndParams | null>(null);
  const [lastWithdrawParams, setLastWithdrawParams] =
    useState<WithdrawBrndParams | null>(null);
  const [needsDeposit, setNeedsDeposit] = useState(false);
  const [pendingDepositAmount, setPendingDepositAmount] = useState<
    bigint | null
  >(null);
  const [lastOperation, setLastOperation] = useState<
    "approve" | "deposit" | "withdraw" | null
  >(null);

  // BRND wallet balance
  const {
    data: brndBalance,
    isLoading: isLoadingBrndBalance,
    refetch: refetchBrndBalance,
  } = useReadContract({
    address: BRND_STAKING_CONFIG.BRND_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Vault shares balance
  const {
    data: vaultShares,
    isLoading: isLoadingVaultShares,
    refetch: refetchVaultShares,
  } = useReadContract({
    address: BRND_STAKING_CONFIG.TELLER_VAULT,
    abi: ERC4626_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Convert vault shares to BRND amount
  const {
    data: stakedBrndAmount,
    isLoading: isLoadingStakedAmount,
    refetch: refetchStakedAmount,
  } = useReadContract({
    address: BRND_STAKING_CONFIG.TELLER_VAULT,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: vaultShares ? [vaultShares as bigint] : undefined,
    query: {
      enabled: !!vaultShares,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Withdrawal delay configuration
  const {
    data: withdrawDelayTimeSeconds,
    isLoading: isLoadingWithdrawDelay,
    refetch: refetchWithdrawDelay,
  } = useReadContract({
    address: BRND_STAKING_CONFIG.TELLER_VAULT,
    abi: ERC4626_ABI,
    functionName: "withdrawDelayTimeSeconds",
    query: {
      enabled: !!userAddress,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // When shares were last transferred to user
  const {
    data: sharesLastTransferredAt,
    isLoading: isLoadingLastTransferred,
    refetch: refetchLastTransferred,
  } = useReadContract({
    address: BRND_STAKING_CONFIG.TELLER_VAULT,
    abi: ERC4626_ABI,
    functionName: "getSharesLastTransferredAt",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Maximum redeemable shares (0 if withdrawal delay is active)
  const {
    data: maxRedeemableShares,
    isLoading: isLoadingMaxRedeem,
    refetch: refetchMaxRedeem,
  } = useReadContract({
    address: BRND_STAKING_CONFIG.TELLER_VAULT,
    abi: ERC4626_ABI,
    functionName: "maxRedeem",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Function to convert BRND amount to vault shares
  const convertBrndToShares = useCallback((brndAmount: string): bigint => {
    try {
      const decimals = 18;
      const brndBigInt = parseUnits(brndAmount, decimals);
      
      // Calculate the ratio of requested BRND to total staked BRND
      if (stakedBrndAmount && vaultShares) {
        const totalStakedBigInt = stakedBrndAmount as bigint;
        const totalSharesBigInt = vaultShares as bigint;
        
        // Calculate proportional shares: (requestedBRND * totalShares) / totalStaked
        const requiredShares = (brndBigInt * totalSharesBigInt) / totalStakedBigInt;
        
        // Calculate proportional shares conversion
        
        return requiredShares;
      }
      
      // Fallback to 1:1 conversion if no vault data
      return brndBigInt;
    } catch (error) {
      return parseUnits(brndAmount, 18); // Fallback to 1:1 conversion
    }
  }, [stakedBrndAmount, vaultShares]);

  // Current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: BRND_STAKING_CONFIG.BRND_TOKEN,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: userAddress
        ? [userAddress, BRND_STAKING_CONFIG.TELLER_VAULT]
        : undefined,
      query: {
        enabled: !!userAddress,
        refetchInterval: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    }
  );

  // Vault status checks for debugging
  const { data: vaultAsset } = useReadContract({
    address: BRND_STAKING_CONFIG.TELLER_VAULT,
    abi: ERC4626_ABI,
    functionName: "asset",
    query: {
      enabled: !!userAddress,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Vault asset validation
  useEffect(() => {
    if (vaultAsset && userAddress) {
      // Validate vault asset matches expected token
    }
  }, [vaultAsset, userAddress]);

  // Combined loading state
  const isPending = isWritePending;

  // Helper functions for withdrawal delay
  const getWithdrawAvailableAt = useCallback((): Date | null => {
    if (!sharesLastTransferredAt || !withdrawDelayTimeSeconds) return null;
    
    const lastTransferTime = Number(sharesLastTransferredAt) * 1000; // Convert to milliseconds
    const delayMs = Number(withdrawDelayTimeSeconds) * 1000; // Convert to milliseconds
    return new Date(lastTransferTime + delayMs);
  }, [sharesLastTransferredAt, withdrawDelayTimeSeconds]);

  const getSecondsUntilWithdrawable = useCallback((): number => {
    const availableAt = getWithdrawAvailableAt();
    if (!availableAt) return 0;
    
    const now = Date.now();
    const timeUntil = availableAt.getTime() - now;
    return Math.max(0, Math.ceil(timeUntil / 1000)); // Return seconds, minimum 0
  }, [getWithdrawAvailableAt]);

  const isWithdrawAvailable = useCallback((): boolean => {
    return getSecondsUntilWithdrawable() === 0;
  }, [getSecondsUntilWithdrawable]);

  const formatTimeRemaining = useCallback((seconds: number): string => {
    if (seconds <= 0) return "";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, []);

  // Enhanced error handling
  const parseContractError = (error: any): string => {
    const errorMessage =
      error?.message || error?.shortMessage || "Unknown error";

    // Parse contract error for user-friendly message

    // Check for specific Teller contract errors
    if (errorMessage.includes("P")) {
      return "Pool is paused. Please try again later.";
    }
    if (errorMessage.includes("MMCT")) {
      return "Mismatched collateral token. Wrong token type.";
    }
    if (errorMessage.includes("LMP")) {
      return "Liquidity limit exceeded. Pool doesn't have enough liquidity.";
    }
    if (errorMessage.includes("FD")) {
      return "First deposit restriction. Only owner can make first deposit.";
    }
    if (errorMessage.includes("IS")) {
      return "Insufficient shares. Pool activation requirements not met.";
    }
    if (errorMessage.includes("TB")) {
      return "Token balance mismatch. Transfer verification failed.";
    }

    // Generic wallet/transaction errors
    if (
      errorMessage.includes("User rejected") ||
      errorMessage.includes("user rejected")
    ) {
      return "Transaction was cancelled by user.";
    }
    if (errorMessage.includes("insufficient funds")) {
      return "Insufficient funds for transaction gas fees.";
    }
    if (errorMessage.includes("exceeds balance")) {
      return "Insufficient token balance for this transaction.";
    }
    if (errorMessage.includes("execution reverted")) {
      return "Contract execution failed. The transaction was reverted by the smart contract. Check your inputs and try again.";
    }

    return `Transaction failed: ${errorMessage}`;
  };

  // Monitor state changes
  useEffect(() => {
    // State change monitoring for debugging purposes
  }, [
    hash,
    isWritePending,
    isConfirming,
    isConfirmed,
    receipt,
    writeError,
    error,
  ]);

  // Clear operation state when user rejects transaction
  useEffect(() => {
    if (writeError) {
      const errorMessage =
        (writeError as any)?.message || (writeError as any)?.shortMessage || "";
      if (
        errorMessage.includes("rejected") ||
        errorMessage.includes("User rejected")
      ) {
        // User rejected transaction - clear operation state
        setLastOperation(null);
        setNeedsDeposit(false);
        setPendingDepositAmount(null);
      }
    }
  }, [writeError]);

  // Clear error and operation state when user changes
  useEffect(() => {
    setError(null);
    setLastOperation(null);
    setNeedsDeposit(false);
    setPendingDepositAmount(null);
  }, [userAddress]);

  // Stake BRND tokens (approve + deposit flow)
  const stakeBrnd = useCallback(
    async (params: StakeBrndParams) => {
      // Start staking BRND tokens
      setError(null);

      if (!userAddress) {
        setError("Wallet not connected");
        return;
      }

      if (!params.amount || parseFloat(params.amount) <= 0) {
        setError("Invalid amount");
        return;
      }

      // Check user balance with precision safety
      const userBalance = brndBalance ? parseFloat(formatUnits(brndBalance as bigint, 18)) : 0;
      const requestedAmount = parseFloat(params.amount);
      
      // Check user balance with precision safety
      
      // Add small buffer for precision issues (0.000001 BRND)
      const balanceBuffer = 0.000001;
      if (userBalance < requestedAmount || (requestedAmount > userBalance - balanceBuffer && requestedAmount !== userBalance)) {
        setError(`Insufficient balance. You have ${userBalance.toFixed(6)} BRND but trying to stake ${requestedAmount} BRND`);
        return;
      }

      try {
        const decimals = 18; // BRND has 18 decimals
        // const rawAmount = parseFloat(params.amount); // Not used

        // Use the exact amount for deposit - no rounding up needed
        const amountBigInt = parseUnits(params.amount, decimals);

        // Check allowance - refresh first to get latest data
        const { data: latestAllowance } = await refetchAllowance();
        const allowance = latestAllowance || currentAllowance;

        if (!allowance || (allowance as bigint) < amountBigInt) {
          // Need to approve first - approve exact amount needed

          setLastStakeParams(params);
          setPendingDepositAmount(amountBigInt);
          setNeedsDeposit(true);
          setLastOperation("approve");

          writeContract({
            address: BRND_STAKING_CONFIG.BRND_TOKEN,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BRND_STAKING_CONFIG.TELLER_VAULT, amountBigInt],
            chainId: 8453,
          });
        } else {
          // Already approved, deposit directly

          setLastStakeParams(params);
          setLastOperation("deposit");

          writeContract({
            address: BRND_STAKING_CONFIG.TELLER_VAULT,
            abi: ERC4626_ABI,
            functionName: "deposit",
            args: [amountBigInt, userAddress],
            chainId: 8453,
          });
        }
      } catch (error: any) {
        setError(parseContractError(error));
        // Clear operation state on error
        setLastOperation(null);
        setNeedsDeposit(false);
        setPendingDepositAmount(null);
      }
    },
    [userAddress, writeContract, currentAllowance, refetchAllowance]
  );

  // Withdraw BRND tokens (redeem shares from vault)
  const withdrawBrnd = useCallback(
    async (params: WithdrawBrndParams) => {
      // Start withdrawing BRND tokens
      setError(null);

      if (!userAddress) {
        setError("Wallet not connected");
        return;
      }

      if (!params.shares || parseFloat(params.shares) <= 0) {
        setError("Invalid withdrawal amount");
        return;
      }

      // Check if user has enough staked BRND with precision safety
      const userStakedAmount = stakedBrndAmount ? parseFloat(formatUnits(stakedBrndAmount as bigint, 18)) : 0;
      const requestedAmount = parseFloat(params.shares);
      
      // Check if user has enough staked BRND with precision safety
      
      // Add small buffer for precision issues (0.000001 BRND)
      const balanceBuffer = 0.000001;
      if (userStakedAmount < requestedAmount || (requestedAmount > userStakedAmount - balanceBuffer && requestedAmount !== userStakedAmount)) {
        setError(`Insufficient staked balance. You have ${userStakedAmount.toFixed(6)} BRND staked but trying to withdraw ${requestedAmount} BRND`);
        return;
      }

      try {
        // Convert BRND amount to vault shares
        const sharesBigInt = convertBrndToShares(params.shares);

        setLastWithdrawParams(params);
        setLastOperation("withdraw");

        writeContract({
          address: BRND_STAKING_CONFIG.TELLER_VAULT,
          abi: ERC4626_ABI,
          functionName: "redeem",
          args: [sharesBigInt, userAddress, userAddress],
          chainId: 8453,
        });
      } catch (error: any) {
        setError(parseContractError(error));
        // Clear operation state on error
        setLastOperation(null);
      }
    },
    [userAddress, writeContract, stakedBrndAmount, convertBrndToShares]
  );

  // Handle approval confirmation - then trigger deposit
  useEffect(() => {
    const handleApprovalSuccess = async () => {
      // Handle approval confirmation and trigger deposit

      if (
        !isConfirmed ||
        !receipt ||
        !needsDeposit ||
        !pendingDepositAmount ||
        !userAddress ||
        lastOperation !== "approve"
      ) {
        return;
      }

      try {
        // Approval confirmed, now deposit

        // Approval confirmed, now deposit
        setNeedsDeposit(false);
        setLastOperation("deposit");

        writeContract({
          address: BRND_STAKING_CONFIG.TELLER_VAULT,
          abi: ERC4626_ABI,
          functionName: "deposit",
          args: [pendingDepositAmount, userAddress],
          chainId: 8453,
        });

        setPendingDepositAmount(null);
      } catch (error: any) {
        setError("Failed to deposit after approval");
        setNeedsDeposit(false);
        setPendingDepositAmount(null);
        setLastOperation(null);
      }
    };

    handleApprovalSuccess();
  }, [
    isConfirmed,
    receipt,
    needsDeposit,
    pendingDepositAmount,
    userAddress,
    writeContract,
    lastOperation,
  ]);

  // Handle stake success
  useEffect(() => {
    const handleStakeSuccess = async () => {
      // Handle successful stake transaction

      // Only handle success for deposit operations, not approval operations
      if (
        !isConfirmed ||
        !receipt ||
        !lastStakeParams ||
        needsDeposit ||
        lastOperation !== "deposit"
      ) {
        return;
      }

      try {
        // Store current balances BEFORE refetch for optimistic updates
        const currentBrndBalance = brndBalance ? formatUnits(brndBalance as bigint, 18) : "0";
        const currentStakedAmount = stakedBrndAmount ? formatUnits(stakedBrndAmount as bigint, 18) : "0";

        // Trigger callback FIRST with old balances for optimistic updates
        if (onStakeSuccess) {
          onStakeSuccess({
            amount: lastStakeParams.amount,
            txHash: receipt.transactionHash,
            blockNumber: Number(receipt.blockNumber),
            currentBrndBalance,
            currentStakedAmount,
          });
        }

        // Then refresh balances from RPC
        await refetchBrndBalance();
        await refetchVaultShares();
        await refetchStakedAmount();
        await refetchAllowance();

        setLastStakeParams(null);
        setLastOperation(null);
      } catch (error: any) {
        // Error in success handler
      }
    };

    handleStakeSuccess();
  }, [
    isConfirmed,
    receipt,
    lastStakeParams,
    needsDeposit,
    lastOperation,
    onStakeSuccess,
    refetchBrndBalance,
    refetchVaultShares,
    refetchStakedAmount,
    refetchAllowance,
  ]);

  // Handle withdraw success
  useEffect(() => {
    const handleWithdrawSuccess = async () => {
      // Handle successful withdraw transaction

      // Only handle success for withdraw operations
      if (
        !isConfirmed ||
        !receipt ||
        !lastWithdrawParams ||
        lastOperation !== "withdraw"
      ) {
        return;
      }

      try {
        // Store current balances BEFORE refetch for optimistic updates
        const currentBrndBalance = brndBalance ? formatUnits(brndBalance as bigint, 18) : "0";
        const currentStakedAmount = stakedBrndAmount ? formatUnits(stakedBrndAmount as bigint, 18) : "0";

        // Trigger callback FIRST with old balances for optimistic updates
        if (onWithdrawSuccess) {
          onWithdrawSuccess({
            shares: lastWithdrawParams.shares,
            txHash: receipt.transactionHash,
            blockNumber: Number(receipt.blockNumber),
            currentBrndBalance,
            currentStakedAmount,
          });
        }

        // Then refresh balances from RPC
        await refetchBrndBalance();
        await refetchVaultShares();
        await refetchStakedAmount();

        setLastWithdrawParams(null);
        setLastOperation(null);
      } catch (error: any) {
        // Error in withdraw success handler
      }
    };

    handleWithdrawSuccess();
  }, [
    isConfirmed,
    receipt,
    lastWithdrawParams,
    lastOperation,
    onWithdrawSuccess,
    refetchBrndBalance,
    refetchVaultShares,
    refetchStakedAmount,
  ]);

  return {
    userAddress,
    isConnected,

    // Write contract states
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    receipt,
    error: error || (writeError ? parseContractError(writeError) : null),
    writeError,

    // BRND Staking functions
    stakeBrnd,
    withdrawBrnd,

    // BRND Balances
    brndBalance: brndBalance ? formatUnits(brndBalance as bigint, 18) : "0",
    vaultShares: vaultShares ? formatUnits(vaultShares as bigint, 18) : "0",
    stakedBrndAmount: stakedBrndAmount
      ? formatUnits(stakedBrndAmount as bigint, 18)
      : "0",

    // BRND Loading states
    isLoadingBrndBalances:
      isLoadingBrndBalance || isLoadingVaultShares || isLoadingStakedAmount,

    // BRND Refresh function
    refreshBrndBalances: () => {
      refetchBrndBalance();
      refetchVaultShares();
      refetchStakedAmount();
      refetchAllowance();
      refetchWithdrawDelay();
      refetchLastTransferred();
      refetchMaxRedeem();
    },

    // Withdrawal delay data and functions
    withdrawDelayTimeSeconds: withdrawDelayTimeSeconds 
      ? Number(withdrawDelayTimeSeconds) 
      : 300, // Default 5 minutes if not loaded
    sharesLastTransferredAt: sharesLastTransferredAt 
      ? Number(sharesLastTransferredAt) 
      : 0,
    maxRedeemableShares: maxRedeemableShares 
      ? formatUnits(maxRedeemableShares as bigint, 18) 
      : "0",
    getWithdrawAvailableAt,
    getSecondsUntilWithdrawable,
    isWithdrawAvailable,
    formatTimeRemaining,
    
    // Loading states for withdrawal delay
    isLoadingWithdrawDelayInfo: 
      isLoadingWithdrawDelay || isLoadingLastTransferred || isLoadingMaxRedeem,
  };
};
