// Dependencies
import { request } from './api';

// Types
export interface AirdropClaimStatusResponse {
  success: true;
  data: {
    fid: number;
    canClaim: boolean;
    reason: string;
    hasClaimed: boolean;
    contractStatus: {
      merkleRootSet: boolean;
      claimingEnabled: boolean;
      totalClaimed: string;
      escrowBalance: string;
      allowance: string;
    };
    eligibility: {
      inSnapshot: boolean;
      amount: string | null;
    };
  };
}

export interface AirdropSignatureResponse {
  success: true;
  data: {
    fid: number;
    walletAddress: string;
    amount: string;
    merkleRoot: string;
    proof: string[];
    signature: string;
    deadline: number;
    snapshotId: number;
    contractAddress: string;
    message: string;
  };
}

export interface AirdropErrorResponse {
  success: false;
  error: string;
}

export type AirdropApiResponse =
  | AirdropClaimStatusResponse
  | AirdropErrorResponse;
export type AirdropSignatureApiResponse =
  | AirdropSignatureResponse
  | AirdropErrorResponse;

/**
 * Check user's airdrop claim status and eligibility
 */
export const checkClaimStatus =
  async (): Promise<AirdropClaimStatusResponse> => {
    const response = await request<AirdropClaimStatusResponse>(
      '/airdrop-service/claim-status',
      {
        method: 'GET',
      }
    );

    return response;
  };

/**
 * Get claim signature and proof for user
 */
export const getClaimSignature = async (
  walletAddress: string,
  snapshotId?: number
): Promise<AirdropSignatureResponse> => {
  const response = await request<AirdropSignatureResponse>(
    '/airdrop-service/claim-signature',
    {
      method: 'POST',
      body: {
        walletAddress,
        ...(snapshotId && { snapshotId }),
      },
    }
  );

  const candidate = response as unknown as {
    success?: boolean;
    data?: unknown;
    fid?: number;
  };

  // Handle case where response might be the data directly or wrapped
  if (candidate.success === false) {
    const errorResponse = response as unknown as AirdropErrorResponse;
    throw new Error(errorResponse.error || 'Failed to get claim signature');
  }

  // Check if response has the expected structure
  if (!candidate.data && typeof candidate.fid !== 'number') {
    throw new Error('Invalid response structure from claim signature endpoint');
  }

  // If response doesn't have data property but has the fields directly, wrap it
  if (!candidate.data && typeof candidate.fid === 'number') {
    return {
      success: true,
      data: response as unknown as AirdropSignatureResponse['data'],
    };
  }

  return response;
};
