import Typography from "@/components/Typography";
import styles from "./AlreadySharedView.module.scss";

type AlreadySharedWalletInfoProps = {
  isWalletMismatch: boolean;
  rewardRecipient?: `0x${string}`;
};

export function AlreadySharedWalletInfo({
  isWalletMismatch,
  rewardRecipient,
}: AlreadySharedWalletInfoProps) {
  if (!isWalletMismatch || !rewardRecipient) {
    return null;
  }

  return (
    <div className={styles.walletWarning}>
      <Typography
        variant={"geist"}
        weight={"medium"}
        size={12}
        lineHeight={16}
        textAlign={"center"}
      >
        ⚠️ You voted through another miniapp client using that wallet. Your daily
        rewards will be sent to your registered wallet:{" "}
        {`${rewardRecipient.slice(0, 6)}...${rewardRecipient.slice(-4)}`}
      </Typography>
    </div>
  );
}
