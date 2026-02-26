import type { StoriesOperationToken } from './useStoriesInMotion.async';

export interface AuthorizeWalletParams {
  fid: number;
  deadline: number;
  signature: string;
}

export interface LevelUpParams {
  fid: number;
  newLevel: number;
  deadline: number;
  signature: string;
}

export interface VoteParams {
  brandIds: [number, number, number];
  authData?: string;
}

export interface ClaimRewardParams {
  amount: string;
  fid: number;
  day: number;
  deadline: number;
  signature: string;
}

export interface UserInfo {
  fid: number;
  brndPowerLevel: number;
  lastVoteDay: number;
  totalVotes: number;
}

export interface PowerLevelInfo {
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

export interface StakeInfo {
  walletBalance: string;
  vaultShares: string;
  stakedAmount: string;
  totalBalance: string;
  addresses: string[];
}

export interface TxCallbackData {
  txHash: string;
  blockNumber: number;
  operation: string;
  [key: string]: unknown;
}

export type ContractUserInfoTuple = readonly [bigint, bigint, bigint, bigint];
export type TxLog = { topics?: readonly string[] };
export type StoriesOperation =
  | 'levelup'
  | 'approve'
  | 'vote'
  | 'claimReward'
  | 'createBrand'
  | 'updateBrand';
export type ClaimSignatureRequest = (
  voteId: string,
  recipientAddress: string,
  transactionHash: string,
  castedFrom: number
) => Promise<{
  claimSignature?:
    | {
        signature: string;
        amount: string;
        deadline: number;
        nonce: number;
        canClaim: boolean;
      }
    | null;
  day: number;
  castHash?: string;
  verified?: boolean;
}>;
export type ConfirmOperationHandlers = Record<
  StoriesOperation,
  (txData: TxCallbackData) => void
>;
export type FailedOperationHandlers = Partial<
  Record<StoriesOperation, (errorMessage: string) => void>
>;
export type StoriesWriteRunContext = { currentUserFid: number | null };

export type ClaimSignatureRequestResult = {
  claimSignature: {
    signature: string;
    amount: string;
    deadline: number;
    nonce: number;
    canClaim: boolean;
  };
  day: number;
  amount: string;
  castHash: string;
};

export type BrandMutationInput = {
  brandId?: number;
  handle?: string;
  metadataHash: string;
  fid: number;
  walletAddress: string;
};

export const STORIES_FALLBACK_ERRORS = {
  LEVEL_UP: 'Level up failed',
  VOTE: 'Vote failed',
  CLAIM_REWARD: 'Claim reward failed',
} as const;

export type OnchainOperationFailure = {
  operationToken: StoriesOperationToken;
  errorValue: unknown;
  fallbackMessage: string;
  action: string;
  includeErrorMeta?: boolean;
};
