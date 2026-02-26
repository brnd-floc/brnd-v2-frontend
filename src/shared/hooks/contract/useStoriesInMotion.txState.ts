export const buildTxCallbackData = ({
  transactionHash,
  blockNumber,
  operation,
}: {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  operation: string;
}) => ({
  txHash: transactionHash,
  blockNumber: Number(blockNumber),
  operation,
});

export const shouldHandleStoriesTxSuccess = ({
  isConfirmed,
  hasReceipt,
  lastOperation,
}: {
  isConfirmed: boolean;
  hasReceipt: boolean;
  lastOperation: string | null;
}) => isConfirmed && hasReceipt && Boolean(lastOperation);

export const getStoriesOperationFlags = (lastOperation: string | null) => ({
  isApproving: lastOperation === 'approve',
  isVoting: lastOperation === 'vote',
  isCreatingBrand: lastOperation === 'createBrand',
  isUpdatingBrand: lastOperation === 'updateBrand',
});

export const deriveWalletAuthorizedState = ({
  authorizedFid,
  userInfoFid,
  userFid,
}: {
  authorizedFid: bigint | undefined;
  userInfoFid: number;
  userFid: number | null;
}) => {
  const fidFromContract = authorizedFid ? Number(authorizedFid) : 0;
  const fidFromAuth = userFid || 0;

  if (fidFromAuth <= 0) {
    return false;
  }

  return fidFromContract === fidFromAuth || userInfoFid === fidFromAuth;
};
