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
import { parseUnits, formatUnits } from "viem";

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

export interface BuyPodiumParams {
  tokenId: number;
  buyerFid: number;
  deadline: number;
  signature: string;
}

export interface ClaimRepeatFeesParams {
  tokenId: number;
  feeAmount: string;
  deadline: number;
  signature: string;
}

export interface PodiumData {
  brandIds: [number, number, number];
  genesisCreatorFid: number;
  ownerFid: number;
  claimCount: number;
  currentPrice: string;
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
  onClaimProceedsSuccess?: (txData: any) => void,
  onClaimRoyaltiesSuccess?: (txData: any) => void,
  onClaimAllSuccess?: (txData: any) => void
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
    | "claimProceeds"
    | "claimRoyalties"
    | "claimAll"
    | null
  >(null);
  const [pendingClaimData, setPendingClaimData] =
    useState<ClaimPodiumParams | null>(null);
  const [pendingBuyData, setPendingBuyData] = useState<BuyPodiumParams | null>(
    null
  );
  const [pendingFeeClaimData, setPendingFeeClaimData] =
    useState<ClaimRepeatFeesParams | null>(null);
  const [pendingApprovalAmount, setPendingApprovalAmount] = useState<
    bigint | null
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

  const getBuyPodiumSignature = useCallback(
    async (tokenId: number, deadline: number) => {
      const { getFarcasterToken } = await import("@/shared/utils/auth");
      getFarcasterToken();

      return await request<{
        signature: string;
        price: string;
      }>(`${BLOCKCHAIN_SERVICE}/podium/buy-signature`, {
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

  const getCurrentPrice = useCallback(
    async (arrangementHash: string): Promise<string> => {
      try {
        const price = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "getCurrentPrice",
          args: [arrangementHash as `0x${string}`],
        });
        return formatUnits(price as bigint, 18);
      } catch (error) {
        console.error("Failed to get current price:", error);
        return "0";
      }
    },
    []
  );

  const isArrangementMinted = useCallback(
    async (brandIds: [number, number, number]): Promise<boolean> => {
      try {
        const isMinted = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "isArrangementMinted",
          args: [brandIds],
        });
        return isMinted as boolean;
      } catch (error) {
        console.error("Failed to check if arrangement is minted:", error);
        return false;
      }
    },
    []
  );

  const getTokenIdForArrangement = useCallback(
    async (brandIds: [number, number, number]): Promise<number> => {
      try {
        const tokenId = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "getTokenIdForArrangement",
          args: [brandIds],
        });
        return Number(tokenId);
      } catch (error) {
        console.error("Failed to get token ID:", error);
        return 0;
      }
    },
    []
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

        const [
          brandIds,
          genesisCreatorFid,
          ownerFid,
          claimCount,
          currentPrice,
          totalFeesEarned,
          createdAt,
        ] = podium as any;

        return {
          brandIds: [
            Number(brandIds[0]),
            Number(brandIds[1]),
            Number(brandIds[2]),
          ] as [number, number, number],
          genesisCreatorFid: Number(genesisCreatorFid),
          ownerFid: Number(ownerFid),
          claimCount: Number(claimCount),
          currentPrice: formatUnits(currentPrice as bigint, 18),
          totalFeesEarned: formatUnits(totalFeesEarned as bigint, 18),
          createdAt: Number(createdAt),
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
        const balances = await readContract(config, {
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "getClaimableBalances",
          args: [BigInt(fid)],
        });

        const [proceeds, royalties] = balances as [bigint, bigint];

        return {
          proceeds: formatUnits(proceeds, 18),
          royalties: formatUnits(royalties, 18),
        };
      } catch (error) {
        console.error("Failed to get claimable balances:", error);
        return { proceeds: "0", royalties: "0" };
      }
    },
    []
  );

  const getTotalPodiums = useCallback(async (): Promise<number> => {
    try {
      const total = await readContract(config, {
        address: PODIUM_CONTRACT_CONFIG.CONTRACT,
        abi: BRND_PODIUM_COLLECTABLES_ABI,
        functionName: "totalPodiums",
        args: [],
      });
      return Number(total);
    } catch (error) {
      console.error("Failed to get total podiums:", error);
      return 0;
    }
  }, []);

  // ============================================================================
  //                          WRITE FUNCTIONS
  // ============================================================================

  // Claim a new podium (first mint)
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
        // Convert directly to BigInt - don't use parseUnits as it expects BRND units
        const price = BigInt(signatureData.price);
        console.log("💰 [ClaimPodium] Price:", {
          raw: signatureData.price,
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
        });

        // Check BRND balance - brndBalance is already in wei (bigint) from contract
        const balance = brndBalance ? (brndBalance as bigint) : 0n;
        console.log("💰 [ClaimPodium] Balance check:", {
          balanceRaw: brndBalance,
          balanceWei: balance.toString(),
          balanceBRND: formatUnits(balance, 18),
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
          comparison: `${balance.toString()} < ${price.toString()} = ${
            balance < price
          }`,
        });

        if (balance < price) {
          const needBRND = formatUnits(price, 18);
          const haveBRND = formatUnits(balance, 18);
          const errorMsg = `Insufficient BRND balance. Need ${needBRND} BRND, have ${haveBRND} BRND`;
          console.error("❌ [ClaimPodium] Balance check failed:", errorMsg);
          throw new Error(errorMsg);
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

  // Buy an existing podium
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
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        // Get signature from backend
        console.log("📝 [BuyPodium] Requesting signature from backend");
        const signatureData = await getBuyPodiumSignature(tokenId, deadline);

        // Backend returns price in wei format (as string like "2000000000000000000000000")
        // Convert directly to BigInt - don't use parseUnits as it expects BRND units
        const price = BigInt(signatureData.price);
        console.log("💰 [BuyPodium] Price:", {
          raw: signatureData.price,
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
        });

        // Check BRND balance - brndBalance is already in wei (bigint) from contract
        const balance = brndBalance ? (brndBalance as bigint) : 0n;
        console.log("💰 [BuyPodium] Balance check:", {
          balanceRaw: brndBalance,
          balanceWei: balance.toString(),
          balanceBRND: formatUnits(balance, 18),
          priceWei: price.toString(),
          priceBRND: formatUnits(price, 18),
          comparison: `${balance.toString()} < ${price.toString()} = ${
            balance < price
          }`,
        });

        if (balance < price) {
          const needBRND = formatUnits(price, 18);
          const haveBRND = formatUnits(balance, 18);
          const errorMsg = `Insufficient BRND balance. Need ${needBRND} BRND, have ${haveBRND} BRND`;
          console.error("❌ [BuyPodium] Balance check failed:", errorMsg);
          throw new Error(errorMsg);
        }

        // Check and handle BRND approval
        const allowance = (brndAllowance as bigint) || 0n;
        if (allowance < price) {
          console.log("⚠️ [BuyPodium] Insufficient allowance, approval needed");
          setPendingBuyData({
            tokenId,
            buyerFid: userFid,
            deadline,
            signature: signatureData.signature,
          });
          setPendingApprovalAmount(price);
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
        setPendingBuyData({
          tokenId,
          buyerFid: userFid,
          deadline,
          signature: signatureData.signature,
        });

        await writeContract({
          address: PODIUM_CONTRACT_CONFIG.CONTRACT,
          abi: BRND_PODIUM_COLLECTABLES_ABI,
          functionName: "buyPodium",
          args: [
            BigInt(tokenId),
            BigInt(userFid),
            BigInt(deadline),
            signatureData.signature as `0x${string}`,
          ],
          chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
        });
      } catch (error: any) {
        console.error("❌ [BuyPodium] Buy failed:", error);
        setError(error.message || "Buy podium failed");
        setLastOperation(null);
        setPendingBuyData(null);
      }
    },
    [
      userAddress,
      userFid,
      switchToBase,
      getBuyPodiumSignature,
      brndBalance,
      brndAllowance,
      writeContract,
    ]
  );

  // Claim repeat fees
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

        const feeAmount = parseUnits(signatureData.feeAmount, 18);
        console.log(
          "💰 [ClaimFees] Fee amount:",
          formatUnits(feeAmount, 18),
          "BRND"
        );

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

  // Claim proceeds (from sales)
  const claimProceeds = useCallback(async () => {
    console.log("💵 [ClaimProceeds] Starting claim proceeds flow");
    setError(null);
    await switchToBase();

    if (!userAddress || !userFid) {
      setError("Wallet not connected or user not authenticated");
      return;
    }

    try {
      setLastOperation("claimProceeds");

      await writeContract({
        address: PODIUM_CONTRACT_CONFIG.CONTRACT,
        abi: BRND_PODIUM_COLLECTABLES_ABI,
        functionName: "claimProceeds",
        args: [BigInt(userFid)],
        chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
      });
    } catch (error: any) {
      console.error("❌ [ClaimProceeds] Claim proceeds failed:", error);
      setError(error.message || "Claim proceeds failed");
      setLastOperation(null);
    }
  }, [userAddress, userFid, switchToBase, writeContract]);

  // Claim royalties (genesis creator)
  const claimRoyalties = useCallback(async () => {
    console.log("💵 [ClaimRoyalties] Starting claim royalties flow");
    setError(null);
    await switchToBase();

    if (!userAddress || !userFid) {
      setError("Wallet not connected or user not authenticated");
      return;
    }

    try {
      setLastOperation("claimRoyalties");

      await writeContract({
        address: PODIUM_CONTRACT_CONFIG.CONTRACT,
        abi: BRND_PODIUM_COLLECTABLES_ABI,
        functionName: "claimRoyalties",
        args: [BigInt(userFid)],
        chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
      });
    } catch (error: any) {
      console.error("❌ [ClaimRoyalties] Claim royalties failed:", error);
      setError(error.message || "Claim royalties failed");
      setLastOperation(null);
    }
  }, [userAddress, userFid, switchToBase, writeContract]);

  // Claim all (proceeds + royalties)
  const claimAll = useCallback(async () => {
    console.log("💵 [ClaimAll] Starting claim all flow");
    setError(null);
    await switchToBase();

    if (!userAddress || !userFid) {
      setError("Wallet not connected or user not authenticated");
      return;
    }

    try {
      setLastOperation("claimAll");

      await writeContract({
        address: PODIUM_CONTRACT_CONFIG.CONTRACT,
        abi: BRND_PODIUM_COLLECTABLES_ABI,
        functionName: "claimAll",
        args: [BigInt(userFid)],
        chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
      });
    } catch (error: any) {
      console.error("❌ [ClaimAll] Claim all failed:", error);
      setError(error.message || "Claim all failed");
      setLastOperation(null);
    }
  }, [userAddress, userFid, switchToBase, writeContract]);

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
            // Retry the pending operation
            if (pendingClaimData) {
              console.log("🔄 [Approve] Auto-retrying claim after approval");
              setPendingApprovalAmount(null);
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
            } else if (pendingBuyData) {
              console.log("🔄 [Approve] Auto-retrying buy after approval");
              setPendingApprovalAmount(null);
              setLastOperation("buyPodium");

              await writeContract({
                address: PODIUM_CONTRACT_CONFIG.CONTRACT,
                abi: BRND_PODIUM_COLLECTABLES_ABI,
                functionName: "buyPodium",
                args: [
                  BigInt(pendingBuyData.tokenId),
                  BigInt(pendingBuyData.buyerFid),
                  BigInt(pendingBuyData.deadline),
                  pendingBuyData.signature as `0x${string}`,
                ],
                chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
              });
            }
          } catch (error) {
            console.error("❌ [Approve] Auto-retry failed:", error);
            setPendingClaimData(null);
            setPendingBuyData(null);
            setPendingApprovalAmount(null);
          }
        }, 1000);
      } catch (error: any) {
        setError("Failed to proceed after approval");
        setPendingApprovalAmount(null);
        setLastOperation(null);
      }
    };

    handleApprovalSuccess();
  }, [
    isConfirmed,
    receipt,
    pendingApprovalAmount,
    userAddress,
    writeContract,
    lastOperation,
    pendingClaimData,
    pendingBuyData,
    refetchAllowance,
  ]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && receipt && lastOperation) {
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
          setPendingBuyData(null);
          break;
        case "claimRepeatFees":
          onClaimFeesSuccess?.(txData);
          setPendingFeeClaimData(null);
          break;
        case "claimProceeds":
          onClaimProceedsSuccess?.(txData);
          break;
        case "claimRoyalties":
          onClaimRoyaltiesSuccess?.(txData);
          break;
        case "claimAll":
          onClaimAllSuccess?.(txData);
          break;
      }

      setLastOperation(null);
      setPendingApprovalAmount(null);
    }
  }, [
    isConfirmed,
    receipt,
    lastOperation,
    onClaimPodiumSuccess,
    onBuyPodiumSuccess,
    onClaimFeesSuccess,
    onClaimProceedsSuccess,
    onClaimRoyaltiesSuccess,
    onClaimAllSuccess,
    refetchBrndBalance,
    refetchAllowance,
  ]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError && lastOperation) {
      console.error("❌ [Transaction] Transaction failed", {
        operation: lastOperation,
        error: writeError.message,
        hasPendingFeeClaim: !!pendingFeeClaimData,
      });
      setLastOperation(null);
      setError(writeError.message || "Transaction failed");
      setPendingClaimData(null);
      setPendingBuyData(null);
      setPendingFeeClaimData(null);
      setPendingApprovalAmount(null);
    }
  }, [writeError, lastOperation, pendingFeeClaimData]);

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
    isClaimingProceeds: lastOperation === "claimProceeds",
    isClaimingRoyalties: lastOperation === "claimRoyalties",
    isClaimingAll: lastOperation === "claimAll",

    // Loading states
    isLoadingBrndBalance,

    // Actions
    switchToBase,
    claimPodium,
    buyPodium,
    claimRepeatFees,
    claimProceeds,
    claimRoyalties,
    claimAll,

    // View functions
    getArrangementHash,
    getCurrentPrice,
    isArrangementMinted,
    getTokenIdForArrangement,
    getPodium,
    getClaimableBalances,
    getTotalPodiums,

    // Refresh functions
    refreshData: () => {
      refetchBrndBalance();
      refetchAllowance();
    },
  };
};
