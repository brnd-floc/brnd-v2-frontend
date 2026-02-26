// Dependencies
import { useState, useCallback, useEffect } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { Hex } from 'viem'; // Import Hex type for explicit casting

// Services
import { getClaimSignature } from '@/services/airdrop';

// Config
import { AIRDROP_CONTRACT_CONFIG, AIRDROP_ABI } from '@/config/contracts';

// Types
export interface AirdropClaimParams {
  fid: number;
  walletAddress: string;
  snapshotId?: number;
}

type ErrorWithMeta = {
  message?: string;
  shortMessage?: string;
  reason?: string;
  cause?: unknown;
  data?: unknown;
  error?: unknown;
  stack?: string;
  name?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
};

const asErrorWithMeta = (value: unknown): ErrorWithMeta => {
  const record = asRecord(value);
  if (!record) return {};

  return {
    message:
      typeof record.message === 'string' ? (record.message as string) : undefined,
    shortMessage:
      typeof record.shortMessage === 'string'
        ? (record.shortMessage as string)
        : undefined,
    reason:
      typeof record.reason === 'string' ? (record.reason as string) : undefined,
    cause: record.cause,
    data: record.data,
    error: record.error,
    stack: typeof record.stack === 'string' ? (record.stack as string) : undefined,
    name: typeof record.name === 'string' ? (record.name as string) : undefined,
  };
};

const extractRevertMessage = (raw: string): string => {
  const revertPatterns = [
    /revert(?:ed)?:\s*(.+)/i,
    /revert reason:\s*(.+)/i,
    /execution reverted:\s*(.+)/i,
    /reverted\s+(.+)/i,
    /'(.+)'/,
  ];

  for (const pattern of revertPatterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      return `Reverted: ${match[1]}`;
    }
  }

  return raw;
};

const extractTransactionErrorMessage = (
  value: unknown,
  {
    mapUserRejected = false,
  }: {
    mapUserRejected?: boolean;
  } = {}
): string => {
  const err = asErrorWithMeta(value);
  let message = err.message || err.shortMessage || 'Transaction failed';
  message = extractRevertMessage(message);

  if (
    mapUserRejected &&
    (message.includes('User rejected') || message.includes('user rejected'))
  ) {
    return 'Transaction was rejected';
  }

  if (err.reason) {
    return `Reverted: ${err.reason}`;
  }

  const dataRecord = asRecord(err.data);
  if (typeof err.data === 'string') {
    return `Reverted: ${err.data}`;
  }
  if (dataRecord && typeof dataRecord.message === 'string') {
    return `Reverted: ${dataRecord.message}`;
  }

  const nestedError = asErrorWithMeta(err.error);
  if (nestedError.message) {
    return extractRevertMessage(nestedError.message);
  }

  return message;
};

export const useAirdropClaim = () => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const { address } = useAccount();

  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  /**
   * Claims airdrop tokens using backend signature and proof
   */
  const claimAirdrop = useCallback(
    async (params: AirdropClaimParams) => {
      console.log('🚀 [claimAirdrop] Starting airdrop claim process...', {
        fid: params.fid,
        walletAddress: params.walletAddress,
        snapshotId: params.snapshotId,
        connectedAddress: address,
      });

      if (!address) {
        console.error('❌ [claimAirdrop] Wallet not connected');
        throw new Error('Wallet not connected');
      }

      if (address.toLowerCase() !== params.walletAddress.toLowerCase()) {
        console.error('❌ [claimAirdrop] Address mismatch', {
          connected: address,
          provided: params.walletAddress,
        });
        throw new Error(
          'Connected wallet address does not match provided address'
        );
      }

      setIsClaiming(true);
      setTransactionError(null); // Clear any previous errors

      try {
        console.log(
          '📡 [claimAirdrop] Requesting claim signature from backend...'
        );
        // Get signature and proof from backend
        const claimData = await getClaimSignature(
          params.walletAddress,
          params.snapshotId
        );

        console.log('✅ [claimAirdrop] Claim signature received:', {
          hasData: !!claimData.data,
          fid: claimData.data?.fid,
          amount: claimData.data?.amount,
          hasProof: !!claimData.data?.proof,
          proofLength: claimData.data?.proof?.length,
          hasSignature: !!claimData.data?.signature,
          deadline: claimData.data?.deadline,
          contractAddress: claimData.data?.contractAddress,
        });

        // Validate required fields
        if (!claimData.data) {
          console.error(
            '❌ [claimAirdrop] Claim data is missing \'data\' property:',
            claimData
          );
          throw new Error('Invalid claim data: missing \'data\' property');
        }

        const { fid, amount, proof, deadline, signature } = claimData.data;

        if (!fid) {
          console.error(
            '❌ [claimAirdrop] Missing fid in claim data:',
            claimData.data
          );
          throw new Error('Invalid claim data: missing \'fid\'');
        }

        if (!amount) {
          console.error(
            '❌ [claimAirdrop] Missing amount in claim data:',
            claimData.data
          );
          throw new Error('Invalid claim data: missing \'amount\'');
        }

        if (!proof || !Array.isArray(proof) || proof.length === 0) {
          console.error(
            '❌ [claimAirdrop] Missing or invalid proof in claim data:',
            claimData.data
          );
          throw new Error('Invalid claim data: missing or invalid \'proof\'');
        }

        if (!deadline) {
          console.error(
            '❌ [claimAirdrop] Missing deadline in claim data:',
            claimData.data
          );
          throw new Error('Invalid claim data: missing \'deadline\'');
        }

        if (!signature) {
          console.error(
            '❌ [claimAirdrop] Missing signature in claim data:',
            claimData.data
          );
          throw new Error('Invalid claim data: missing \'signature\'');
        }

        console.log('📝 [claimAirdrop] Preparing contract call...', {
          contract: AIRDROP_CONTRACT_CONFIG.CONTRACT,
          fid: String(fid),
          baseAmount: String(amount),
          proofLength: proof.length,
          deadline: String(deadline),
          signatureLength: signature.length,
        });

        // Convert amount to BigInt for baseAmount (contract will multiply by 1e18 internally)
        const argFid: bigint = BigInt(fid);
        const argBaseAmount: bigint = BigInt(amount);
        // Cast proof elements to `0x${string}`[] (array of Hex strings)
        const argProof: Hex[] = proof.map((p) => p as Hex);
        const argDeadline: bigint = BigInt(deadline);
        // Cast signature to `0x${string}` (Hex string)
        const argSignature: Hex = signature as Hex;

        console.log('📝 [claimAirdrop] AirdropClaimV3 PAYLOAD:');
        console.log('   - ARG 1 (FID):', argFid.toString(), '(Type: BigInt)');
        console.log(
          '   - ARG 2 (Base Amount):',
          argBaseAmount.toString(),
          '(Type: BigInt)'
        );
        console.log(
          '   - ARG 3 (Proof):',
          argProof[0],
          `... (${argProof.length} hashes)`,
          '(Type: bytes32[])'
        );
        console.log(
          '   - ARG 4 (Deadline):',
          argDeadline.toString(),
          '(Type: BigInt)'
        );
        console.log(
          '   - ARG 5 (Signature):',
          argSignature.slice(0, 10) + '...',
          `(Length: ${argSignature.length})`,
          '(Type: bytes)'
        );

        // Call AirdropClaimV3 contract with the claimAirdrop function (5 parameters)
        console.log('📤 [claimAirdrop] Calling AirdropClaimV3.claimAirdrop...');

        // Add this comprehensive debugging block:
        console.log(
          '🔥 [TRANSACTION DEBUG] =========================================='
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] EXACT DATA BEING SENT TO CONTRACT:'
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] =========================================='
        );

        // Contract details
        console.log(
          '🔥 [TRANSACTION DEBUG] Contract Address:',
          AIRDROP_CONTRACT_CONFIG.CONTRACT
        );
        console.log('🔥 [TRANSACTION DEBUG] Function Name: claimAirdrop');

        // Raw arguments (before conversion)
        console.log('🔥 [TRANSACTION DEBUG] RAW ARGUMENTS FROM BACKEND:');
        console.log(
          '🔥 [TRANSACTION DEBUG] - Raw FID:',
          fid,
          '(type:',
          typeof fid,
          ')'
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - Raw Amount:',
          amount,
          '(type:',
          typeof amount,
          ')'
        );
        console.log('🔥 [TRANSACTION DEBUG] - Raw Proof Length:', proof.length);
        console.log(
          '🔥 [TRANSACTION DEBUG] - Raw Deadline:',
          deadline,
          '(type:',
          typeof deadline,
          ')'
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - Raw Signature Length:',
          signature.length
        );

        // Converted arguments (what will be sent)
        console.log('🔥 [TRANSACTION DEBUG] CONVERTED ARGUMENTS FOR CONTRACT:');
        console.log(
          '🔥 [TRANSACTION DEBUG] - ARG[0] FID (BigInt):',
          argFid.toString()
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - ARG[1] BaseAmount (BigInt):',
          argBaseAmount.toString()
        );
        console.log('🔥 [TRANSACTION DEBUG] - ARG[2] Proof Array:');
        argProof.forEach((proof, index) => {
          console.log(`🔥 [TRANSACTION DEBUG]   - Proof[${index}]: ${proof}`);
        });
        console.log(
          '🔥 [TRANSACTION DEBUG] - ARG[3] Deadline (BigInt):',
          argDeadline.toString()
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - ARG[4] Signature (Hex):',
          argSignature
        );

        // Exact args array that will be passed
        const exactArgs = [
          argFid,
          argBaseAmount,
          argProof as `0x${string}`[],
          argDeadline,
          argSignature as `0x${string}`,
        ];

        console.log('🔥 [TRANSACTION DEBUG] FINAL ARGS ARRAY:');
        console.log('🔥 [TRANSACTION DEBUG] - args.length:', exactArgs.length);
        exactArgs.forEach((arg, index) => {
          if (Array.isArray(arg)) {
            console.log(
              `🔥 [TRANSACTION DEBUG] - args[${index}] (Array): [${arg.length} elements]`,
              arg
            );
          } else {
            console.log(
              `🔥 [TRANSACTION DEBUG] - args[${index}] (${typeof arg}):`,
              arg.toString()
            );
          }
        });

        // Data validation
        console.log('🔥 [TRANSACTION DEBUG] DATA VALIDATION:');
        console.log(
          '🔥 [TRANSACTION DEBUG] - All proof elements are valid hex:',
          argProof.every((p) => p.startsWith('0x') && p.length === 66)
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - Signature is valid hex:',
          argSignature.startsWith('0x') && argSignature.length === 132
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - FID is positive integer:',
          argFid > 0n
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - BaseAmount is positive integer:',
          argBaseAmount > 0n
        );
        console.log(
          '🔥 [TRANSACTION DEBUG] - Deadline is future timestamp:',
          argDeadline > BigInt(Math.floor(Date.now() / 1000))
        );

        console.log(
          '🔥 [TRANSACTION DEBUG] =========================================='
        );

        // Serialize the complete object for backend analysis
        const transactionData = {
          contractAddress: AIRDROP_CONTRACT_CONFIG.CONTRACT,
          functionName: 'claimAirdrop',
          args: {
            fid: argFid.toString(),
            baseAmount: argBaseAmount.toString(),
            proof: argProof,
            deadline: argDeadline.toString(),
            signature: argSignature,
          },
          rawArgs: exactArgs.map((arg) =>
            Array.isArray(arg) ? arg : arg.toString()
          ),
        };

        console.log('🔥 [TRANSACTION DEBUG] SERIALIZED TRANSACTION DATA:');
        console.log(JSON.stringify(transactionData, null, 2));
        console.log(
          '🔥 [TRANSACTION DEBUG] =========================================='
        );

        await writeContract({
          address: AIRDROP_CONTRACT_CONFIG.CONTRACT,
          abi: AIRDROP_ABI,
          functionName: 'claimAirdrop',
          args: [
            argFid,
            argBaseAmount,
            argProof as `0x${string}`[],
            argDeadline,
            argSignature as `0x${string}`,
          ],
          gas: 1000000n,
        });

        console.log('✅ [claimAirdrop] Contract write initiated successfully');
      } catch (error: unknown) {
        const errorMeta = asErrorWithMeta(error);
        console.error('❌ [claimAirdrop] Airdrop claim failed:', error);
        console.error('❌ [claimAirdrop] Error details:', {
          message: errorMeta.message,
          stack: errorMeta.stack,
          name: errorMeta.name,
          cause: errorMeta.cause,
        });

        // Extract error message for UI display
        let errorMessage = errorMeta.message || 'Transaction failed';

        // Try to extract revert reason from error
        if (errorMeta.message) {
          // Check for common revert patterns
          const revertMatch = errorMeta.message.match(/revert(?:ed)?:\s*(.+)/i);
          if (revertMatch) {
            errorMessage = `Reverted: ${revertMatch[1]}`;
          } else if (errorMeta.message.includes('User rejected')) {
            errorMessage = 'Transaction was rejected';
          } else if (errorMeta.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for transaction';
          }
        }

        setTransactionError(errorMessage);
        throw error;
      } finally {
        setIsClaiming(false);
        console.log(
          '🏁 [claimAirdrop] Claim process finished (isClaiming set to false)'
        );
      }
    },
    [writeContract, address]
  );

  // Monitor transaction receipt errors (revert errors)
  useEffect(() => {
    if (receiptError) {
      console.error(
        '❌ [useAirdropClaim] Transaction receipt error:',
        receiptError
      );
      const receiptMeta = asErrorWithMeta(receiptError);
      console.error('❌ [useAirdropClaim] Error object structure:', {
        message: receiptMeta.message,
        shortMessage: receiptMeta.shortMessage,
        reason: receiptMeta.reason,
        cause: receiptMeta.cause,
        data: receiptMeta.data,
        error: receiptMeta.error,
        allKeys: Object.keys(asRecord(receiptError) ?? {}),
      });

      const errorMessage = extractTransactionErrorMessage(receiptError);

      console.error(
        '❌ [useAirdropClaim] Extracted error message:',
        errorMessage
      );
      setTransactionError(errorMessage);
    }
  }, [receiptError]);

  // Monitor write errors (pre-transaction errors)
  useEffect(() => {
    if (writeError) {
      console.error('❌ [useAirdropClaim] Write contract error:', writeError);
      const writeMeta = asErrorWithMeta(writeError);
      console.error('❌ [useAirdropClaim] Write error object structure:', {
        message: writeMeta.message,
        shortMessage: writeMeta.shortMessage,
        reason: writeMeta.reason,
        cause: writeMeta.cause,
        data: writeMeta.data,
        error: writeMeta.error,
        allKeys: Object.keys(asRecord(writeError) ?? {}),
      });

      const errorMessage = extractTransactionErrorMessage(writeError, {
        mapUserRejected: true,
      });

      console.error(
        '❌ [useAirdropClaim] Extracted write error message:',
        errorMessage
      );
      setTransactionError(errorMessage);
    }
  }, [writeError]);

  // Clear error when starting a new claim
  useEffect(() => {
    if (hash) {
      setTransactionError(null);
    }
  }, [hash]);

  return {
    claimAirdrop,
    isClaiming: isClaiming || isWritePending,
    isConfirming,
    isConfirmed,
    hash,
    error: writeError || receiptError,
    transactionError, // Expose the formatted error message for UI
  };
};
