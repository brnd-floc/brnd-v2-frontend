export const validateWalletAuthorizedInput = ({
  userAddress,
  userFid,
}: {
  userAddress?: `0x${string}`;
  userFid: number | null;
}) => {
  if (!userAddress || !userFid) {
    return "Wallet not authorized";
  }
  return null;
};

export const validateVoteInput = ({
  userAddress,
}: {
  userAddress?: `0x${string}`;
}) => {
  if (!userAddress) {
    return "Wallet not connected";
  }
  return null;
};

export const validateBrandMutationInput = ({
  brandId,
  handle,
  metadataHash,
  fid,
  walletAddress,
  requireBrandId,
}: {
  brandId?: number;
  handle?: string;
  metadataHash: string;
  fid: number;
  walletAddress: string;
  requireBrandId: boolean;
}) => {
  if (requireBrandId && (!brandId || brandId <= 0)) {
    return "Valid brand ID is required";
  }

  if (!requireBrandId && (!handle || handle.trim() === "")) {
    return "Brand handle is required";
  }

  if (!metadataHash || metadataHash.trim() === "") {
    return "Metadata hash (IPFS) is required";
  }

  if (!fid || fid <= 0) {
    return "Valid FID is required";
  }

  if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return "Invalid wallet address format";
  }

  return null;
};

export const validateClaimVerificationInput = ({
  voteId,
  castedFrom,
}: {
  voteId: string;
  castedFrom: number;
}) => {
  if (!voteId || voteId.trim() === "") {
    return "Vote ID is required to claim reward";
  }

  if (!castedFrom || castedFrom <= 0) {
    return "Casted from is required to claim reward";
  }

  return null;
};
