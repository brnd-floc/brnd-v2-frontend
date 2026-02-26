import { AlreadySharedStatus } from './AlreadySharedStatus';

type AlreadySharedStatusPanelProps = {
  transactionHash?: string;
  claimAmountWei?: string;
  showReady: boolean;
  claimError?: string | null;
  contractError?: string | null;
};

export function AlreadySharedStatusPanel({
  transactionHash,
  claimAmountWei,
  showReady,
  claimError,
  contractError,
}: AlreadySharedStatusPanelProps) {
  return (
    <AlreadySharedStatus
      transactionHash={transactionHash}
      claimAmountWei={claimAmountWei}
      showReady={showReady}
      claimError={claimError}
      contractError={contractError}
    />
  );
}
