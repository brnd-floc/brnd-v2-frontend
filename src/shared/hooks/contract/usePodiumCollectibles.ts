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


  // ============================================================================
  //                              HOOK
  // ============================================================================

  export const usePodiumCollectibles = (
    onClaimPodiumSuccess?: (txData: any) => void,
    onBuyPodiumSuccess?: (txData: any) => void,
  ) => {
    const { address: userAddress, isConnected, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const {
      writeContract,
      writeContractAsync,
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
    const [isFetchingSignature, setIsFetchingSignature] = useState(false);
    const [lastOperation, setLastOperation] = useState<
      | "approve"
      | "claimPodium"
      | "buyPodium"
      | "claimRepeatFees"
      | "claimBalance"
      | null
    >(null);
    // Store only brandIds for pending claim - we'll fetch fresh signature after approval
    const [pendingClaimBrandIds, setPendingClaimBrandIds] = useState<
      [number, number, number] | null
    >(null);
    const [_pendingClaimData, setPendingClaimData] =
      useState<ClaimPodiumParams | null>(null);
    const [pendingBuyTokenId, setPendingBuyTokenId] = useState<number | null>(
      null
    );
    const [pendingApprovalAmount, setPendingApprovalAmount] = useState<
      bigint | null
    >(null);
    const [pendingOperationType, setPendingOperationType] = useState<
      "claim" | "buy" | null
    >(null);
    // Track the expected hash for the current operation to prevent race conditions
    const [expectedOperationHash, setExpectedOperationHash] = useState<
      `0x${string}` | null
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
          metadataURI: string;
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
        setIsFetchingSignature(true);

        try {
          await switchToBase();

          if (!userAddress || !userFid) {
            setError("Wallet not connected or user not authenticated");
            setIsFetchingSignature(false);
            return;
          }

          const deadline = Math.floor(Date.now() / 1000) + 3600;

          // Get signature from backend
          console.log("📝 [ClaimPodium] Requesting signature from backend");
          const signatureData = await getClaimPodiumSignature(brandIds, deadline);

          if (!signatureData.eligible) {
            setIsFetchingSignature(false);
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

          // Use cached BRND balance from hook (avoids rate limiting)
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
            setIsFetchingSignature(false);
            throw new Error(
              `Insufficient BRND balance. Need ${needBRND} BRND, have ${haveBRND} BRND`
            );
          }

          setIsFetchingSignature(false);

          // Check and handle BRND approval
          const allowance = (brndAllowance as bigint) || 0n;
          if (allowance < price) {
            console.log(
              "⚠️ [ClaimPodium] Insufficient allowance, approval needed"
            );
            // Store only brandIds - we'll fetch fresh signature after approval
            setPendingClaimBrandIds(brandIds);
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

          const txHash = await writeContractAsync({
            address: PODIUM_CONTRACT_CONFIG.CONTRACT,
            abi: BRND_PODIUM_COLLECTABLES_ABI,
            functionName: "claimPodium",
            args: [
              brandIds,
              BigInt(userFid!),
              signatureData.metadataURI,  // ← ADD THIS
              BigInt(deadline),
              signatureData.signature as `0x${string}`,
            ],
            chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
          });
          setExpectedOperationHash(txHash);
        } catch (error: any) {
          console.error("❌ [ClaimPodium] Claim failed:", error);
          setError(error.message || "Claim podium failed");
          setLastOperation(null);
          setPendingClaimData(null);
          setPendingClaimBrandIds(null);
          setExpectedOperationHash(null);
          setIsFetchingSignature(false);
        }
      },
      [
        userAddress,
        userFid,
        switchToBase,
        getClaimPodiumSignature,
        brndBalance,
        brndAllowance,
        writeContractAsync,
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

        // Validate FID is a valid positive number
        if (userFid <= 0) {
          setError("Invalid user FID. Please reconnect your wallet.");
          return;
        }

        try {
          // First check if we're not trying to buy our own podium
          console.log("📝 [BuyPodium] Checking podium ownership");
          const podiumData = await getPodium(tokenId);
          if (podiumData && podiumData.ownerFid === userFid) {
            setError("You cannot buy your own podium");
            return;
          }

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

          // Refresh balance to get latest value before checking
          await refetchBrndBalance();

          // Check BRND balance (use fresh value from refetch or cached)
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
          const txHash = await writeContractAsync({
            address: PODIUM_CONTRACT_CONFIG.CONTRACT,
            abi: BRND_PODIUM_COLLECTABLES_ABI,
            functionName: "buyPodium",
            args: [BigInt(tokenId), BigInt(userFid)],
            chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
          });
          setExpectedOperationHash(txHash);
        } catch (error: any) {
          console.error("❌ [BuyPodium] Buy failed:", error);

          // Parse contract-specific errors for better user messages
          let errorMessage = "Buy podium failed";
          const errorString = error.message || error.toString();

          if (errorString.includes("CannotBuyOwnPodium")) {
            errorMessage = "You cannot buy your own podium";
          } else if (errorString.includes("NotMinted")) {
            errorMessage = "This podium has not been minted yet";
          } else if (errorString.includes("InvalidFid")) {
            errorMessage = "Invalid user ID. Please reconnect your wallet.";
          } else if (errorString.includes("InsufficientBalance")) {
            errorMessage = "Insufficient BRND balance in your wallet";
          } else if (errorString.includes("TransferBlocked")) {
            errorMessage = "This podium transfer is currently blocked";
          } else if (errorString.includes("User rejected") || errorString.includes("user rejected")) {
            errorMessage = "Transaction was cancelled";
          } else if (error.message) {
            errorMessage = error.message;
          }

          setError(errorMessage);
          setLastOperation(null);
          setPendingBuyTokenId(null);
          setExpectedOperationHash(null);
        }
      },
      [
        userAddress,
        userFid,
        switchToBase,
        brndBalance,
        brndAllowance,
        writeContractAsync,
        getPodium,
        refetchBrndBalance,
      ]
    );




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

        // Set fetching state immediately to show "Preparing..." during allowance sync
        setIsFetchingSignature(true);

        try {
          // Wait for allowance to propagate across RPC nodes
          // Use fewer attempts with longer delays to avoid rate limiting
          const requiredAllowance = pendingApprovalAmount;
          const maxAttempts = 5;
          const delayMs = 2000;

          console.log("🔄 [Approve] Waiting for allowance to propagate...");

          // Initial delay to let the transaction propagate
          await new Promise((resolve) => setTimeout(resolve, 2000));

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Only use refetchAllowance (uses react-query, more efficient)
            const result = await refetchAllowance();
            const currentAllowance = result.data as bigint | undefined;

            console.log(`🔄 [Approve] Attempt ${attempt}/${maxAttempts} - Allowance: ${currentAllowance}`);

            if (currentAllowance && currentAllowance >= requiredAllowance) {
              console.log("✅ [Approve] Allowance confirmed!");
              // Additional delay to ensure wallet's RPC has synced
              console.log("🔄 [Approve] Waiting for wallet RPC to sync...");
              await new Promise((resolve) => setTimeout(resolve, 3000));
              break;
            }

            if (attempt === maxAttempts) {
              throw new Error("Allowance not confirmed after approval. Please try again.");
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          // Now proceed with the actual operation
          if (pendingOperationType === "claim" && pendingClaimBrandIds) {
            console.log("🔄 [Approve] Fetching fresh signature after approval");
            setIsFetchingSignature(true);

            // Fetch a FRESH signature from backend
            const freshDeadline = Math.floor(Date.now() / 1000) + 3600;
            const freshSignatureData = await getClaimPodiumSignature(
              pendingClaimBrandIds,
              freshDeadline
            );

            if (!freshSignatureData.eligible) {
              throw new Error(
                freshSignatureData.reason || "Not eligible to claim this podium"
              );
            }

            console.log("🔄 [Approve] Got fresh signature, proceeding with claim");
            setPendingApprovalAmount(null);
            setPendingOperationType(null);
            setLastOperation("claimPodium");

            const brandIds = pendingClaimBrandIds;
            setPendingClaimBrandIds(null);
            setPendingClaimData({
              brandIds,
              fid: userFid!,
              deadline: freshDeadline,
              signature: freshSignatureData.signature,
            });

            setIsFetchingSignature(false);
            const txHash = await writeContractAsync({
              address: PODIUM_CONTRACT_CONFIG.CONTRACT,
              abi: BRND_PODIUM_COLLECTABLES_ABI,
              functionName: "claimPodium",
              args: [
                brandIds,
                BigInt(userFid!),
                freshSignatureData.metadataURI,
                BigInt(freshDeadline),
                freshSignatureData.signature as `0x${string}`,
              ],
              chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
            });
            setExpectedOperationHash(txHash);
          } else if (
            pendingOperationType === "buy" &&
            pendingBuyTokenId !== null &&
            userFid
          ) {
            console.log("🔄 [Approve] Auto-retrying buy after approval");
            setPendingApprovalAmount(null);
            setPendingOperationType(null);
            setLastOperation("buyPodium");
            setIsFetchingSignature(false);

            const txHash = await writeContractAsync({
              address: PODIUM_CONTRACT_CONFIG.CONTRACT,
              abi: BRND_PODIUM_COLLECTABLES_ABI,
              functionName: "buyPodium",
              args: [BigInt(pendingBuyTokenId), BigInt(userFid)],
              chainId: PODIUM_CONTRACT_CONFIG.CHAIN_ID,
            });
            setExpectedOperationHash(txHash);
          }
        } catch (error: any) {
          console.error("❌ [Approve] Auto-retry failed:", error);
          setError(error.message || "Failed to claim after approval");
          setPendingClaimData(null);
          setPendingClaimBrandIds(null);
          setPendingBuyTokenId(null);
          setPendingApprovalAmount(null);
          setPendingOperationType(null);
          setExpectedOperationHash(null);
          setIsFetchingSignature(false);
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
      writeContractAsync,
      lastOperation,
      pendingClaimBrandIds,
      pendingBuyTokenId,
      refetchAllowance,
      getClaimPodiumSignature,
    ]);

    // Handle transaction success
    useEffect(() => {
      if (
        isConfirmed &&
        receipt &&
        lastOperation &&
        lastOperation !== "approve" &&
        // Ensure we're confirming the expected transaction, not a stale approval
        expectedOperationHash &&
        receipt.transactionHash === expectedOperationHash
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
        }

        setLastOperation(null);
        setPendingApprovalAmount(null);
        setPendingOperationType(null);
        setExpectedOperationHash(null);
      }
    }, [
      isConfirmed,
      receipt,
      lastOperation,
      expectedOperationHash,
      onClaimPodiumSuccess,
      onBuyPodiumSuccess,
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
        setPendingClaimBrandIds(null);
        setPendingBuyTokenId(null);
        setPendingApprovalAmount(null);
        setPendingOperationType(null);
        setExpectedOperationHash(null);
        setIsFetchingSignature(false);
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
      isPending: isWritePending || isFetchingSignature,
      isConfirming,
      isConfirmed,
      hash,
      receipt,
      error: error || (writeError ? writeError.message : null),
      isApproving: lastOperation === "approve",
      isClaimingPodium: lastOperation === "claimPodium",
      isBuyingPodium: lastOperation === "buyPodium",
      isFetchingSignature,

      // Loading states
      isLoadingBrndBalance,

      // Actions
      switchToBase,
      claimPodium,
      buyPodium,

      // View functions
      getArrangementHash,
      getPriceByTokenId,
      isArrangementMinted,
      getTokenIdForArrangement,
      getPodium,
      getTotalMinted,

      // Refresh functions
      refreshData: () => {
        refetchBrndBalance();
        refetchAllowance();
      },
    };
  };
