// src/shared/hooks/contract/usePodiumCollectibles.ts
import { useState, useCallback, useEffect, useRef } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "@/shared/config/wagmi";
import { formatUnits } from "viem";

import {
  PODIUM_CONTRACT_CONFIG,
  BRND_PODIUM_COLLECTABLES_ABI,
  ERC20_ABI,
} from "@/config/contracts";
import { request } from "@/services/api";
import { BLOCKCHAIN_SERVICE } from "@/config/api";
import { useAuth } from "@/shared/hooks/auth";

// ============================================================================
//                              TYPES
// ============================================================================

export interface ClaimPodiumParams {
  brandIds: [number, number, number];
  fid: number;
  deadline: number;
  signature: string;
}

export interface PodiumData {
  brandIds: [number, number, number];
  genesisCreatorFid: number;
  ownerFid: number;
  claimCount: number;
  lastSalePrice: string;
  totalFeesEarned: string;
  createdAt: number;
}

export interface ClaimableBalances {
  proceeds: string;
  royalties: string;
}

// ============================================================================
//                              HOOK
// ============================================================================

export const usePodiumCollectibles = (
  onClaimPodiumSuccess?: (txData: any) => void,
  onBuyPodiumSuccess?: (txData: any) => void,
  onClaimFeesSuccess?: (txData: any) => void,
  onClaimBalanceSuccess?: (txData: any) => void
) => {
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
  const [lastOperation, setLastOperation] = useState<
    | "approve"
    | "claimPodium"
    | "buyPodium"
    | "claimRepeatFees"
    | "claimBalance"
    | null
  >(null);
  const [pendingClaimData, setPendingClaimData] =
    useState<ClaimPodiumParams | null>(null);
  const [pendingBuyTokenId, setPendingBuyTokenId] = useState<number | null>(
    null
  );
  const [_pendingFeeClaimData, setPendingFeeClaimData] = useState<{
    tokenId: number;
    feeAmount: string;
    deadline: number;
    signature: string;
  } | null>(null);
  const [pendingApprovalAmount, setPendingApprovalAmount] = useState<
    bigint | null
  >(null);
  const [pendingOperationType, setPendingOperationType] = useState<
    "claim" | "buy" | null
  >(null);

  // Get FID from auth context
  const { data: authData } = useAuth();
  const userFid = authData?.fid ? Number(authData.fid) : null;

  // Check if user is on correct network
  const isCorrectNetwork = chainId === PODIUM_CONTRACT_CONFIG.CHAIN_ID;

  // Get BRND balance
  const {
    data: brndBalance,
    isLoading: isLoadingBrndBalance,
    refetch: refetchBrndBalance,
  } = useReadContract({
    address: PODIUM_CONTRACT_CONFIG.BRND_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && isCorrectNetwork,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  });

  // Track previous address to only refetch when it actually changes
  const prevAddressRef = useRef<string | undefined>(undefined);

  // Explicitly refetch balance when wallet address actually changes
  useEffect(() => {
    if (
      userAddress &&
      isCorrectNetwork &&
      isConnected &&
      userAddress !== prevAddressRef.current
    ) {
      prevAddressRef.current = userAddress;
      refetchBrndBalance();
    } else if (!userAddress) {
      prevAddressRef.current = undefined;
    }
  }, [userAddress, isConnected, isCorrectNetwork, refetchBrndBalance]);

  // Get BRND allowance for contract
  const { data: brndAllowance, refetch: refetchAllowance } = useReadContract({
    address: PODIUM_CONTRACT_CONFIG.BRND_TOKEN,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress
      ? [userAddress, PODIUM_CONTRACT_CONFIG.CONTRACT]
      : undefined,
    query: {
      enabled: !!userAddress && isCorrectNetwork,
    },
  });

  // Switch to Base network
  const switchToBase = useCallback(async () => {
    if (!isCorrectNetwork) {
      try {
        await switchChain({ chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID });
      } catch (error) {
        console.error("Failed to switch network:", error);
        setError("Please switch to Base network");
        throw error;
      }
    }
  }, [isCorrectNetwork, switchChain]);

  // ============================================================================
  //                          BACKEND API CALLS
  // ============================================================================

  const getClaimPodiumSignature = useCallback(
    async (brandIds: [number, number, number], deadline: number) => {
      const { getFarcasterToken } = await import("@/shared/utils/auth");
      getFarcasterToken();

      return await request<{
        signature: string;
        price: string;
        eligible: boolean;
        reason?: string;
      }>(`${BLOCKCHAIN_SERVICE}/podium/claim-signature`, {
        method: "POST",
        body: {
          walletAddress: userAddress,
          brandIds,
          deadline,
        },
      });
    },
    [userAddress]
  );

  const getClaimFeesSignature = useCallback(
    async (tokenId: number, deadline: number) => {
      const { getFarcasterToken } = await import("@/shared/utils/auth");
      getFarcasterToken();

      return await request<{
        signature: string;
        feeAmount: string;
      }>(`${BLOCKCHAIN_SERVICE}/podium/claim-fees-signature`, {
        method: "POST",
        body: {
          walletAddress: userAddress,
          tokenId,
          deadline,
        },
      });
    },
    [userAddress]
  );

  // ============================================================================
  //                          VIEW FUNCTIONS
  // ============================================================================

  const getArrangementHash = useCallback(
    async (brandIds: [number, number, number]): Promise<string> => {
      try {
        const hash = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "getArrangementHash",
          args: [brandIds],
        });
        return hash as string;
      } catch (error) {
        console.error("Failed to get arrangement hash:", error);
        throw error;
      }
    },
    []
  );

  const getPriceByTokenId = useCallback(
    async (tokenId: number): Promise<string> => {
      try {
        const price = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "getPriceByTokenId",
          args: [BigInt(tokenId)],
        });
        return formatUnits(price as bigint, 18);
      } catch (error) {
        console.error("Failed to get price by token ID:", error);
        return "0";
      }
    },
    []
  );

  const isArrangementMinted = useCallback(
    async (brandIds: [number, number, number]): Promise<boolean> => {
      try {
        const hash = await getArrangementHash(brandIds);
        const tokenId = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "arrangementToTokenId",
          args: [hash as `0x${string}`],
        });
        return (tokenId as bigint) > 0n;
      } catch (error) {
        console.error("Failed to check if arrangement is minted:", error);
        return false;
      }
    },
    [getArrangementHash]
  );

  const getTokenIdForArrangement = useCallback(
    async (brandIds: [number, number, number]): Promise<number> => {
      try {
        const hash = await getArrangementHash(brandIds);
        const tokenId = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "arrangementToTokenId",
          args: [hash as `0x${string}`],
        });
        return Number(tokenId);
      } catch (error) {
        console.error("Failed to get token ID:", error);
        return 0;
      }
    },
    [getArrangementHash]
  );

  const getPodium = useCallback(
    async (tokenId: number): Promise<PodiumData | null> => {
      try {
        const podium = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "getPodium",
          args: [BigInt(tokenId)],
        });

        // Contract returns: brandIds, genesisCreatorFid, ownerFid, claimCount, lastSalePrice, totalFeesEarned, createdAt
        const result = podium as any;

        return {
          brandIds: [
            Number(result.brandIds[0]),
            Number(result.brandIds[1]),
            Number(result.brandIds[2]),
          ] as [number, number, number],
          genesisCreatorFid: Number(result.genesisCreatorFid),
          ownerFid: Number(result.ownerFid),
          claimCount: Number(result.claimCount),
          lastSalePrice: formatUnits(result.lastSalePrice as bigint, 18),
          totalFeesEarned: formatUnits(result.totalFeesEarned as bigint, 18),
          createdAt: Number(result.createdAt),
        };
      } catch (error) {
        console.error("Failed to get podium:", error);
        return null;
      }
    },
    []
  );

  const getClaimableBalances = useCallback(
    async (fid: number): Promise<ClaimableBalances> => {
      try {
        const [proceeds, royalties] = await Promise.all([
          readContract(config, {
            address: PODIUM_CONTRACT_CONFIG.CONTRACT,
            abi: BRND_PODIUM_COLLECTABLES_ABI,
            functionName: "claimableProceeds",
            args: [BigInt(fid)],
          }),
          readContract(config, {
            address: PODIUM_CONTRACT_CONFIG.CONTRACT,
            abi: BRND_PODIUM_COLLECTABLES_ABI,
            functionName: "claimableRoyalties",
            args: [BigInt(fid)],
          }),
        ]);

        return {
          proceeds: formatUnits(proceeds as bigint, 18),
          royalties: formatUnits(royalties as bigint, 18),
        };
      } catch (error) {
        console.error("Failed to get claimable balances:", error);
        return { proceeds: "0", royalties: "0" };
      }
    },
    []
  );

  const getTotalMinted = useCallback(async (): Promise<number> => {
    try {
      const total = await readContract(config, {
        address: PODIUM_CONTRACT_CONFIG.CONTRACT,
        abi: BRND_PODIUM_COLLECTABLES_ABI,
        functionName: "totalMinted",
        args: [],
      });
      return Number(total);
    } catch (error) {
      console.error("Failed to get total minted:", error);
      return 0;
    }
  }, []);

  // ============================================================================
  //                          WRITE FUNCTIONS
  // ============================================================================

  // Claim a new podium (first mint) - requires signature
  const claimPodium = useCallback(
    async (brandIds: [number, number, number]) => {
      console.log("🏆 [ClaimPodium] Starting claim flow", { brandIds });
      setError(null);
      await switchToBase();

      if (!userAddress || !userFid) {
        setError("Wallet not connected or user not authenticated");
        return;
      }

      try {
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        // Get signature from backend
        console.log("📝 [ClaimPodium] Requesting signature from backend");
        const signatureData = await getClaimPodiumSignature(brandIds, deadline);

        if (!signatureData.eligible) {
          throw new Error(
            signatureData.reason || "Not eligible to claim this podium"
          );
        }

        // Backend returns price in wei format (as string like "1000000000000000000000000")
        const price = BigInt(signatureData.price);
        console.log("💰 [ClaimPodium] Price:", {
          raw: signatureData.price,
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
        });

        // Check BRND balance
        const balance = brndBalance ? (brndBalance as bigint) : 0n;
        console.log("💰 [ClaimPodium] Balance check:", {
          balanceWei: balance.toString(),
          balanceBRND: formatUnits(balance, 18),
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
        });

        if (balance < price) {
          const needBRND = formatUnits(price, 18);
          const haveBRND = formatUnits(balance, 18);
          throw new Error(
            `Insufficient BRND balance. Need ${needBRND} BRND, have ${haveBRND} BRND`
          );
        }

        // Check and handle BRND approval
        const allowance = (brndAllowance as bigint) || 0n;
        if (allowance < price) {
          console.log(
            "⚠️ [ClaimPodium] Insufficient allowance, approval needed"
          );
          setPendingClaimData({
            brandIds,
            fid: userFid,
            deadline,
            signature: signatureData.signature,
          });
          setPendingApprovalAmount(price);
          setPendingOperationType("claim");
          setLastOperation("approve");

          await writeContract({
            address: PODIUM_CONTRACT_CONFIG.BRND_TOKEN,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [PODIUM_CONTRACT_CONFIG.CONTRACT, price],
            chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
          });
          return;
        }

        // Approval is sufficient, proceed with claim
        console.log(
          "✅ [ClaimPodium] Allowance sufficient, proceeding with claim"
        );
        setLastOperation("claimPodium");
        setPendingClaimData({
          brandIds,
          fid: userFid,
          deadline,
          signature: signatureData.signature,
        });

        await writeContract({
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "claimPodium",
          args: [
            brandIds,
            BigInt(userFid),
            BigInt(deadline),
            signatureData.signature as `0x${string}`,
          ],
          chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
        });
      } catch (error: any) {
        console.error("❌ [ClaimPodium] Claim failed:", error);
        setError(error.message || "Claim podium failed");
        setLastOperation(null);
        setPendingClaimData(null);
      }
    },
    [
      userAddress,
      userFid,
      switchToBase,
      getClaimPodiumSignature,
      brndBalance,
      brndAllowance,
      writeContract,
    ]
  );

  // Buy an existing podium - NO signature required
  const buyPodium = useCallback(
    async (tokenId: number) => {
      console.log("💰 [BuyPodium] Starting buy flow", { tokenId });
      setError(null);
      await switchToBase();

      if (!userAddress || !userFid) {
        setError("Wallet not connected or user not authenticated");
        return;
      }

      try {
        // Get price directly from contract
        console.log("📝 [BuyPodium] Getting price from contract");
        const priceRaw = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "getPriceByTokenId",
          args: [BigInt(tokenId)],
        });

        const price = priceRaw as bigint;
        console.log("💰 [BuyPodium] Price:", {
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
        });

        // Check BRND balance
        const balance = brndBalance ? (brndBalance as bigint) : 0n;
        console.log("💰 [BuyPodium] Balance check:", {
          balanceWei: balance.toString(),
          balanceBRND: formatUnits(balance, 18),
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
        });

        if (balance < price) {
          const needBRND = formatUnits(price, 18);
          const haveBRND = formatUnits(balance, 18);
          throw new Error(
            `Insufficient BRND balance. Need ${needBRND} BRND, have ${haveBRND} BRND`
          );
        }

        // Check and handle BRND approval
        const allowance = (brndAllowance as bigint) || 0n;
        if (allowance < price) {
          console.log("⚠️ [BuyPodium] Insufficient allowance, approval needed");
          setPendingBuyTokenId(tokenId);
          setPendingApprovalAmount(price);
          setPendingOperationType("buy");
          setLastOperation("approve");

          await writeContract({
            address: PODIUM_CONTRACT_CONFIG.BRND_TOKEN,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [PODIUM_CONTRACT_CONFIG.CONTRACT, price],
            chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
          });
          return;
        }

        // Approval is sufficient, proceed with buy
        console.log("✅ [BuyPodium] Allowance sufficient, proceeding with buy");
        setLastOperation("buyPodium");
        setPendingBuyTokenId(tokenId);

        // Contract signature: buyPodium(uint256 tokenId, uint256 buyerFid)
        console.log("💰 [BuyPodium] Buying podium", {
          tokenId,
          userFid,
        });
        await writeContract({
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "buyPodium",
          args: [BigInt(tokenId), BigInt(userFid)],
          chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
        });
      } catch (error: any) {
        console.error("❌ [BuyPodium] Buy failed:", error);
        setError(error.message || "Buy podium failed");
        setLastOperation(null);
        setPendingBuyTokenId(null);
      }
    },
    [
      userAddress,
      userFid,
      switchToBase,
      brndBalance,
      brndAllowance,
      writeContract,
    ]
  );

  // Claim repeat fees - requires signature
  const claimRepeatFees = useCallback(
    async (tokenId: number) => {
      console.log("💵 [ClaimFees] Starting claim fees flow", { tokenId });
      setError(null);
      await switchToBase();

      if (!userAddress || !userFid) {
        setError("Wallet not connected or user not authenticated");
        return;
      }

      try {
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        // Get signature from backend
        console.log("📝 [ClaimFees] Requesting signature from backend");
        const signatureData = await getClaimFeesSignature(tokenId, deadline);

        const feeAmount = BigInt(signatureData.feeAmount);
        console.log(
          "💰 [ClaimFees] Fee amount:",
          formatUnits(feeAmount, 18),
          "BRND"
        );

        if (feeAmount === 0n) {
          throw new Error("No fees available to claim");
        }

        setLastOperation("claimRepeatFees");
        setPendingFeeClaimData({
          tokenId,
          feeAmount: signatureData.feeAmount,
          deadline,
          signature: signatureData.signature,
        });

        await writeContract({
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "claimRepeatFees",
          args: [
            BigInt(tokenId),
            feeAmount,
            BigInt(deadline),
            signatureData.signature as `0x${string}`,
          ],
          chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
        });
      } catch (error: any) {
        console.error("❌ [ClaimFees] Claim fees failed:", error);
        setError(error.message || "Claim fees failed");
        setLastOperation(null);
        setPendingFeeClaimData(null);
      }
    },
    [userAddress, userFid, switchToBase, getClaimFeesSignature, writeContract]
  );

  // Claim balance (proceeds + royalties combined)
  const claimBalance = useCallback(async () => {
    console.log("💵 [ClaimBalance] Starting claim balance flow");
    setError(null);
    await switchToBase();

    if (!userAddress || !userFid) {
      setError("Wallet not connected or user not authenticated");
      return;
    }

    try {
      // Check if there's anything to claim
      const balances = await getClaimableBalances(userFid);
      const totalClaimable =
        parseFloat(balances.proceeds) + parseFloat(balances.royalties);

      if (totalClaimable === 0) {
        throw new Error("Nothing to claim");
      }

      console.log("💰 [ClaimBalance] Claimable amounts:", {
        proceeds: balances.proceeds,
        royalties: balances.royalties,
        total: totalClaimable,
      });

      setLastOperation("claimBalance");

      // Contract signature: claimBalance(uint256 fid)
      await writeContract({
        address: PODIUM_CONTRACT_CONFIG.CONTRACT,
        abi: BRND_PODIUM_COLLECTABLES_ABI,
        functionName: "claimBalance",
        args: [BigInt(userFid)],
        chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
      });
    } catch (error: any) {
      console.error("❌ [ClaimBalance] Claim balance failed:", error);
      setError(error.message || "Claim balance failed");
      setLastOperation(null);
    }
  }, [userAddress, userFid, switchToBase, getClaimableBalances, writeContract]);

  // ============================================================================
  //                          TRANSACTION HANDLERS
  // ============================================================================

  // Handle approval confirmation - then trigger pending operation
  useEffect(() => {
    const handleApprovalSuccess = async () => {
      if (
        !isConfirmed ||
        !receipt ||
        !pendingApprovalAmount ||
        !userAddress ||
        lastOperation !== "approve"
      ) {
        return;
      }

      try {
        // Refresh allowance first
        await refetchAllowance();

        // Wait a bit for allowance to update
        setTimeout(async () => {
          try {
            if (pendingOperationType === "claim" && pendingClaimData) {
              console.log("🔄 [Approve] Auto-retrying claim after approval");
              setPendingApprovalAmount(null);
              setPendingOperationType(null);
              setLastOperation("claimPodium");

              await writeContract({
                address: PODIUM_CONTRACT_CONFIG.CONTRACT,
                abi: BRND_PODIUM_COLLECTABLES_ABI,
                functionName: "claimPodium",
                args: [
                  pendingClaimData.brandIds,
                  BigInt(pendingClaimData.fid),
                  BigInt(pendingClaimData.deadline),
                  pendingClaimData.signature as `0x${string}`,
                ],
                chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
              });
            } else if (
              pendingOperationType === "buy" &&
              pendingBuyTokenId !== null &&
              userFid
            ) {
              console.log("🔄 [Approve] Auto-retrying buy after approval");
              setPendingApprovalAmount(null);
              setPendingOperationType(null);
              setLastOperation("buyPodium");

              await writeContract({
                address: PODIUM_CONTRACT_CONFIG.CONTRACT,
                abi: BRND_PODIUM_COLLECTABLES_ABI,
                functionName: "buyPodium",
                args: [BigInt(pendingBuyTokenId), BigInt(userFid)],
                chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
              });
            }
          } catch (error) {
            console.error("❌ [Approve] Auto-retry failed:", error);
            setPendingClaimData(null);
            setPendingBuyTokenId(null);
            setPendingApprovalAmount(null);
            setPendingOperationType(null);
          }
        }, 1000);
      } catch (error: any) {
        setError("Failed to proceed after approval");
        setPendingApprovalAmount(null);
        setPendingOperationType(null);
        setLastOperation(null);
      }
    };

    handleApprovalSuccess();
  }, [
    isConfirmed,
    receipt,
    pendingApprovalAmount,
    pendingOperationType,
    userAddress,
    userFid,
    writeContract,
    lastOperation,
    pendingClaimData,
    pendingBuyTokenId,
    refetchAllowance,
  ]);

  // Handle transaction success
  useEffect(() => {
    if (
      isConfirmed &&
      receipt &&
      lastOperation &&
      lastOperation !== "approve"
    ) {
      console.log("🎉 [Transaction] Transaction confirmed", {
        operation: lastOperation,
        txHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
      });

      const txData = {
        txHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        operation: lastOperation,
      };

      // Refresh data
      refetchBrndBalance();
      refetchAllowance();

      // Call appropriate success callback
      switch (lastOperation) {
        case "claimPodium":
          onClaimPodiumSuccess?.(txData);
          setPendingClaimData(null);
          break;
        case "buyPodium":
          onBuyPodiumSuccess?.(txData);
          setPendingBuyTokenId(null);
          break;
        case "claimRepeatFees":
          onClaimFeesSuccess?.(txData);
          setPendingFeeClaimData(null);
          break;
        case "claimBalance":
          onClaimBalanceSuccess?.(txData);
          break;
      }

      setLastOperation(null);
      setPendingApprovalAmount(null);
      setPendingOperationType(null);
    }
  }, [
    isConfirmed,
    receipt,
    lastOperation,
    onClaimPodiumSuccess,
    onBuyPodiumSuccess,
    onClaimFeesSuccess,
    onClaimBalanceSuccess,
    refetchBrndBalance,
    refetchAllowance,
  ]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError && lastOperation) {
      console.error("❌ [Transaction] Transaction failed", {
        operation: lastOperation,
        error: writeError.message,
      });
      setLastOperation(null);
      setError(writeError.message || "Transaction failed");
      setPendingClaimData(null);
      setPendingBuyTokenId(null);
      setPendingFeeClaimData(null);
      setPendingApprovalAmount(null);
      setPendingOperationType(null);
    }
  }, [writeError, lastOperation]);

  // ============================================================================
  //                          RETURN
  // ============================================================================

  return {
    // Connection state
    userAddress,
    isConnected,
    isCorrectNetwork,
    userFid,

    // Contract state
    brndBalance: brndBalance ? formatUnits(brndBalance as bigint, 18) : "0",
    brndAllowance: brndAllowance
      ? formatUnits(brndAllowance as bigint, 18)
      : "0",

    // Transaction state
    isPending: isWritePending,
    isConfirming,
    isConfirmed,
    hash,
    receipt,
    error: error || (writeError ? writeError.message : null),
    isApproving: lastOperation === "approve",
    isClaimingPodium: lastOperation === "claimPodium",
    isBuyingPodium: lastOperation === "buyPodium",
    isClaimingFees: lastOperation === "claimRepeatFees",
    isClaimingBalance: lastOperation === "claimBalance",

    // Loading states
    isLoadingBrndBalance,

    // Actions
    switchToBase,
    claimPodium,
    buyPodium,
    claimRepeatFees,
    claimBalance,

    // View functions
    getArrangementHash,
    getPriceByTokenId,
    isArrangementMinted,
    getTokenIdForArrangement,
    getPodium,
    getClaimableBalances,
    getTotalMinted,

    // Refresh functions
    refreshData: () => {
      refetchBrndBalance();
      refetchAllowance();
    },
  };
};
