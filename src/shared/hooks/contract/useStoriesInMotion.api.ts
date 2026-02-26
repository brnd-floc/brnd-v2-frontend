import { BLOCKCHAIN_SERVICE, BRAND_SERVICE } from "@/config/api";
import { request } from "@/services/api";
import { getFarcasterToken } from "@/shared/utils/auth";

export interface StoriesPowerLevelInfo {
  currentLevel: number;
  currentPowerLevel: unknown;
  nextLevel: unknown;
  allLevels: Array<{
    id: number;
    title: string;
    description: string;
    multiplier: number;
    actionType?: string;
    isActive?: boolean;
    isCompleted?: boolean;
    requirement?: {
      type: string;
      value: number;
      unit: string;
    };
    clickFunction?: () => void;
    progress?: {
      current: number;
      total: number;
      maxStreak?: number;
      maxDailyStreak?: number;
    };
  }>;
  progress?: {
    maxStreak?: number;
    maxDailyStreak?: number;
  };
}

export interface StoriesStakeInfo {
  walletBalance: string;
  vaultShares: string;
  stakedAmount: string;
  totalBalance: string;
  addresses: string[];
}

export type StoriesApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown; errorMessage: string };

const apiOk = <T>(data: T): StoriesApiResult<T> => ({ ok: true, data });
const apiErr = (error: unknown, fallback: string): StoriesApiResult<never> => ({
  ok: false,
  error,
  errorMessage: error instanceof Error ? error.message : fallback,
});

export const requestAuthorizationSignature = async ({
  userAddress,
  deadline,
}: {
  userAddress?: `0x${string}`;
  deadline: number;
}): Promise<
  StoriesApiResult<{
    fid: number;
    authData?: string;
    signature?: string;
  }>
> => {
  try {
    const data = await request<{
      fid: number;
      authData?: string;
      signature?: string;
    }>(`${BLOCKCHAIN_SERVICE}/authorize-wallet`, {
      method: "POST",
      body: {
        walletAddress: userAddress,
        deadline,
      },
    });
    return apiOk(data);
  } catch (error) {
    return apiErr(error, "Failed to request authorization signature");
  }
};

export const requestLevelUpSignature = async ({
  userAddress,
  newLevel,
  deadline,
}: {
  userAddress?: `0x${string}`;
  newLevel: number;
  deadline: number;
}): Promise<
  StoriesApiResult<{
    validation: {
      eligible: boolean;
      reason?: string;
    };
    signature: string;
  }>
> => {
  try {
    getFarcasterToken();
    const data = await request<{
      validation: {
        eligible: boolean;
        reason?: string;
      };
      signature: string;
    }>(`${BLOCKCHAIN_SERVICE}/level-up`, {
      method: "POST",
      body: {
        newLevel,
        deadline,
        walletAddress: userAddress,
      },
    });
    return apiOk(data);
  } catch (error) {
    return apiErr(error, "Failed to request level-up signature");
  }
};

export const requestVoteAuthorizationSignature = async ({
  userAddress,
  brandIds,
  deadline,
}: {
  userAddress?: `0x${string}`;
  brandIds: [number, number, number];
  deadline: number;
}): Promise<
  StoriesApiResult<{
    authData: string;
    fid: number;
    walletAddress: string;
    brandIds: [number, number, number];
    deadline: number;
    message: string;
  }>
> => {
  try {
    getFarcasterToken();
    const data = await request<{
      authData: string;
      fid: number;
      walletAddress: string;
      brandIds: [number, number, number];
      deadline: number;
      message: string;
    }>(`${BLOCKCHAIN_SERVICE}/authorize-vote`, {
      method: "POST",
      body: {
        walletAddress: userAddress,
        brandIds,
        deadline,
      },
    });
    return apiOk(data);
  } catch (error) {
    return apiErr(error, "Failed to request vote authorization signature");
  }
};

export const requestClaimRewardSignature = async ({
  userAddress,
  castHash,
  voteId,
  recipientAddress,
  transactionHash,
  castedFrom,
}: {
  userAddress?: `0x${string}`;
  castHash: string;
  voteId: string;
  recipientAddress: string;
  transactionHash: string;
  castedFrom: number;
}): Promise<
  StoriesApiResult<{
    verified: boolean;
    pointsAwarded: number;
    newTotalPoints: number;
    message: string;
    day: number;
    claimSignature: {
      signature: string;
      amount: string;
      deadline: number;
      nonce: number;
      canClaim: boolean;
    } | null;
    note?: string;
    castHash: string;
  }>
> => {
  try {
    getFarcasterToken();
    const data = await request<{
      verified: boolean;
      pointsAwarded: number;
      newTotalPoints: number;
      message: string;
      day: number;
      claimSignature: {
        signature: string;
        amount: string;
        deadline: number;
        nonce: number;
        canClaim: boolean;
      } | null;
      note?: string;
      castHash: string;
    }>(`${BRAND_SERVICE}/verify-share`, {
      method: "POST",
      body: {
        castHash,
        voteId,
        recipientAddress: recipientAddress || userAddress,
        transactionHash,
        castedFrom,
      },
    });
    return apiOk(data);
  } catch (error) {
    return apiErr(error, "Failed to verify share");
  }
};

export const requestClaimSignatureForSharedVote = async ({
  userAddress,
  voteId,
  recipientAddress,
  transactionHash,
  castedFrom,
}: {
  userAddress?: `0x${string}`;
  voteId: string;
  recipientAddress: string;
  transactionHash: string;
  castedFrom: number;
}): Promise<
  StoriesApiResult<{
    verified: boolean;
    pointsAwarded: number;
    newTotalPoints: number;
    message: string;
    day: number;
    claimSignature: {
      signature: string;
      amount: string;
      deadline: number;
      nonce: number;
      canClaim: boolean;
    } | null;
    castHash?: string;
    note?: string;
  }>
> => {
  try {
    getFarcasterToken();
    const data = await request<{
      verified: boolean;
      pointsAwarded: number;
      newTotalPoints: number;
      message: string;
      day: number;
      claimSignature: {
        signature: string;
        amount: string;
        deadline: number;
        nonce: number;
        canClaim: boolean;
      } | null;
      castHash?: string;
      note?: string;
    }>(`${BRAND_SERVICE}/verify-share`, {
      method: "POST",
      body: {
        castHash: "",
        voteId,
        recipientAddress: recipientAddress || userAddress,
        transactionHash,
        castedFrom,
      },
    });
    return apiOk(data);
  } catch (error) {
    return apiErr(error, "Failed to fetch shared vote claim signature");
  }
};

export const requestPowerLevelInfo = async (
  fid: number
): Promise<StoriesApiResult<StoriesPowerLevelInfo>> => {
  try {
    const data = await request<StoriesPowerLevelInfo>(
      `${BLOCKCHAIN_SERVICE}/power-level/${fid}`,
      {
        method: "GET",
      }
    );
    return apiOk(data);
  } catch (error) {
    return apiErr(error, "Failed to fetch power level info");
  }
};

export const requestStakeInfo = async (
  fid: number
): Promise<StoriesApiResult<StoriesStakeInfo>> => {
  try {
    const data = await request<StoriesStakeInfo>(
      `${BLOCKCHAIN_SERVICE}/user-stake/${fid}`,
      {
        method: "GET",
      }
    );
    return apiOk(data);
  } catch (error) {
    return apiErr(error, "Failed to fetch stake info");
  }
};
