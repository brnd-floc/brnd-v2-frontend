import { ShareFeedback } from './ShareFeedback';

type ShareStatusPanelProps = {
  isFarcasterClient: boolean | null;
  hasSharedManually: boolean;
  isVerifying: boolean;
  manualVerificationMessageDisplay: boolean;
  claimAmountLabel: string | null;
  hasClaimData: boolean;
  isClaiming: boolean;
  isClaimPending: boolean;
  isClaimConfirming: boolean;
  claimError?: string | null;
  shareError?: string | null;
};

export function ShareStatusPanel(props: ShareStatusPanelProps) {
  return <ShareFeedback {...props} />;
}
