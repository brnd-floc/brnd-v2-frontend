import Typography from '@/components/Typography';
import styles from './ShareView.module.scss';

type ShareRetryPanelProps = {
  showWalletWarning: boolean;
  rewardRecipient?: `0x${string}`;
};

export function ShareRetryPanel({
  showWalletWarning,
  rewardRecipient,
}: ShareRetryPanelProps) {
  if (!showWalletWarning || !rewardRecipient) {
    return null;
  }

  return (
    <div className={styles.walletWarning}>
      <Typography
        variant={'geist'}
        weight={'medium'}
        size={12}
        lineHeight={16}
        textAlign={'center'}
      >
        ⚠️ Rewards will be sent to your registered wallet:{' '}
        {`${rewardRecipient.slice(0, 6)}...${rewardRecipient.slice(-4)}`}
      </Typography>
    </div>
  );
}
