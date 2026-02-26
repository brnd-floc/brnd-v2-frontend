export interface PodiumBrand {
  id: number;
  name: string;
  imageUrl?: string;
  handle?: string;
}

export interface CollectibleData {
  isCollectible: boolean;
  tokenId: number | null;
  price: string | null;
  claimCount: number;
  genesisCreatorFid: number | null;
  genesisCreatorUsername: string | null;
  ownerFid: number | null;
  ownerUsername: string | null;
  ownerPhotoUrl: string | null;
  totalFeesEarned: string;
}

export interface PodiumDetailModalData {
  brand1: PodiumBrand;
  brand2: PodiumBrand;
  brand3: PodiumBrand;
  collectibleData: CollectibleData;
  isLastVoteForCombination?: boolean;
}

export interface VoteHistoryItem {
  id: string;
  date: string;
  brand1: PodiumBrand;
  brand2: PodiumBrand;
  brand3: PodiumBrand;
  isCollectible: boolean;
  isLastVoteForCombination: boolean;
  collectibleTokenId: number | null;
  collectiblePrice: string | null;
  collectibleClaimCount: number;
  collectibleGenesisCreatorFid: number | null;
  collectibleGenesisCreatorUsername: string | null;
  collectibleOwnerFid: number | null;
  collectibleOwnerUsername: string | null;
  collectibleTotalFeesEarned: string;
}

export type ActivityEventType = 'mint' | 'sale' | 'transfer';

export interface ActivityEvent {
  id: number;
  tokenId: number;
  eventType: ActivityEventType;
  price: string | null;
  fromFid: number;
  toFid: number | null;
  fromWallet: string;
  toWallet: string | null;
  txHash: string;
  timestamp: number;
  fromUser?: { username: string; fid: number };
  toUser?: { username: string; fid: number };
}
