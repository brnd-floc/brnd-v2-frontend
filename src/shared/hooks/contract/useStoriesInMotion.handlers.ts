import type {
  ConfirmOperationHandlers,
  FailedOperationHandlers,
  StoriesOperation,
  TxCallbackData,
  TxLog,
} from "./useStoriesInMotion.types";

const hasLogTopics = (log: TxLog): boolean => {
  try {
    return Boolean(log.topics && log.topics.length > 0);
  } catch {
    return false;
  }
};

export const findFirstTopicLog = (
  logs: readonly TxLog[] | undefined
): TxLog | undefined => logs?.find(hasLogTopics);

export const buildConfirmedOperationHandlers = ({
  onLevelUpSuccess,
  onClaimSuccess,
  handleApprovedOperation,
  handleVoteOperationSuccess,
  handleCreateBrandSuccess,
  handleUpdateBrandSuccess,
}: {
  onLevelUpSuccess?: (txData: TxCallbackData) => void;
  onClaimSuccess?: (txData: TxCallbackData) => void;
  handleApprovedOperation: () => void;
  handleVoteOperationSuccess: (txData: TxCallbackData) => void;
  handleCreateBrandSuccess: (txData: TxCallbackData) => void;
  handleUpdateBrandSuccess: (txData: TxCallbackData) => void;
}): ConfirmOperationHandlers => ({
  levelup: (txData: TxCallbackData) => {
    onLevelUpSuccess?.(txData);
  },
  approve: () => {
    handleApprovedOperation();
  },
  vote: (txData: TxCallbackData) => {
    handleVoteOperationSuccess(txData);
  },
  claimReward: (txData: TxCallbackData) => {
    onClaimSuccess?.(txData);
  },
  createBrand: (txData: TxCallbackData) => {
    handleCreateBrandSuccess(txData);
  },
  updateBrand: (txData: TxCallbackData) => {
    handleUpdateBrandSuccess(txData);
  },
});

export const buildFailedOperationHandlers = ({
  clearOperationState,
}: {
  clearOperationState: (operation: StoriesOperation) => void;
}): FailedOperationHandlers => ({
  approve: () => {
    clearOperationState("approve");
  },
  vote: () => {
    clearOperationState("vote");
  },
  createBrand: () => {
    clearOperationState("createBrand");
  },
  updateBrand: () => {
    clearOperationState("updateBrand");
  },
});

export const handleWriteError = ({
  operation,
  errorMessage,
  logStoriesError,
  failedOperationHandlers,
  setLastOperation,
  setError,
}: {
  operation: StoriesOperation;
  errorMessage: string;
  logStoriesError: (...args: unknown[]) => void;
  failedOperationHandlers: FailedOperationHandlers;
  setLastOperation: (operation: StoriesOperation | null) => void;
  setError: (message: string | null) => void;
}) => {
  logStoriesError("❌ [Transaction] Transaction failed", {
    operation,
    error: errorMessage,
  });

  const handler = failedOperationHandlers[operation];
  handler?.(errorMessage);

  setLastOperation(null);
  setError(errorMessage);
};
