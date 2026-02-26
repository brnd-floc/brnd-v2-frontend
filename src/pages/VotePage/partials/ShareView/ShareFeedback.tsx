import Typography from "@/components/Typography";
import styles from "./ShareView.module.scss";

interface ShareFeedbackProps {
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
}

export function ShareFeedback({
  isFarcasterClient,
  hasSharedManually,
  isVerifying,
  manualVerificationMessageDisplay,
  claimAmountLabel,
  hasClaimData,
  isClaiming,
  isClaimPending,
  isClaimConfirming,
  claimError,
  shareError,
}: ShareFeedbackProps) {
  return (
    <>
      <div className={styles.shareMessage}>
        <Typography
          variant={"geist"}
          weight={"medium"}
          size={12}
          lineHeight={16}
          textAlign={"center"}
        >
          {isFarcasterClient === false && !hasSharedManually
            ? "Share your podium, then click below to verify"
            : "Share your podium to unlock 10x BRND rewards"}
        </Typography>
      </div>

      {isVerifying && manualVerificationMessageDisplay && (
        <div className={styles.verificationMessage}>
          <Typography
            variant={"geist"}
            weight={"medium"}
            size={14}
            lineHeight={18}
            textAlign={"center"}
          >
            🔄 Verifying your share...
          </Typography>
        </div>
      )}

      {hasClaimData &&
        !isVerifying &&
        !isClaiming &&
        !isClaimPending &&
        !isClaimConfirming && (
          <div className={styles.verificationMessage}>
            <Typography
              variant={"geist"}
              weight={"medium"}
              size={14}
              lineHeight={18}
              textAlign={"center"}
            >
              ✅ Share verified! Ready to claim {claimAmountLabel} $BRND
            </Typography>
          </div>
        )}

      {(isClaiming || isClaimPending || isClaimConfirming) && (
        <div className={styles.verificationMessage}>
          <Typography
            variant={"geist"}
            weight={"medium"}
            size={14}
            lineHeight={18}
            textAlign={"center"}
          >
            {isClaimPending
              ? "⏳ Confirm reward claim in wallet..."
              : isClaimConfirming
              ? "🔄 Processing reward claim..."
              : "💰 Claiming your reward..."}
          </Typography>
        </div>
      )}

      {(claimError || shareError) && (
        <div className={styles.errorMessage}>
          <Typography
            variant={"geist"}
            weight={"medium"}
            size={14}
            lineHeight={18}
            textAlign={"center"}
          >
            {claimError || shareError}
          </Typography>
        </div>
      )}
    </>
  );
}
