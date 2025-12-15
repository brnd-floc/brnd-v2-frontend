// Dependencies
import { request } from "./api";

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
    try {
      const response = await request<AirdropClaimStatusResponse>(
        "/airdrop-service/claim-status",
        {
          method: "GET",
        }
      );

      return response;
    } catch (error: any) {
      throw error;
    }
  };

/**
 * Get claim signature and proof for user
 */
export const getClaimSignature = async (
  walletAddress: string,
  snapshotId?: number
): Promise<AirdropSignatureResponse> => {
  try {
    const response = await request<AirdropSignatureResponse>(
      "/airdrop-service/claim-signature",
      {
        method: "POST",
        body: {
          walletAddress,
          ...(snapshotId && { snapshotId }),
        },
      }
    );

    // Handle case where response might be the data directly or wrapped
    if ((response as any).success === false) {
      const errorResponse = response as unknown as AirdropErrorResponse;
      throw new Error(errorResponse.error || "Failed to get claim signature");
    }

    // Check if response has the expected structure
    if (!(response as any).data && !(response as any).fid) {
      throw new Error(
        "Invalid response structure from claim signature endpoint"
      );
    }

    // If response doesn't have data property but has the fields directly, wrap it
    if (!(response as any).data && (response as any).fid) {
      return {
        success: true,
        data: response as any,
      } as AirdropSignatureResponse;
    }

    return response;
  } catch (error: any) {
    throw error;
  }
};
