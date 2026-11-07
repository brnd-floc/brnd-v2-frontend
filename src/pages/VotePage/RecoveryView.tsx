import Button from '@/components/Button';
import Typography from '@/components/Typography';
import styles from './partials/ShareView/ShareView.module.scss';

export function RecoveryView({
  isLoading,
  hasClaimed,
  error,
  onRetry,
}: {
  isLoading: boolean;
  hasClaimed: boolean;
  error?: string | null;
  onRetry: () => void;
}) {
  return (
    <div className={styles.body}>
      <div className={styles.container}>
        <Typography size={18} lineHeight={24} variant="druk" weight="wide">
          {hasClaimed ? 'Your reward is already claimed' : 'Your vote is saved'}
        </Typography>
        <Typography>
          {hasClaimed
            ? 'Reload your podium to see the completed reward.'
            : 'Reload your podium to continue sharing or claiming your reward.'}
        </Typography>
        {error && <Typography>{error}</Typography>}
        <Button
          caption={isLoading ? 'Reloading podium...' : 'Retry loading my podium'}
          disabled={isLoading}
          onClick={onRetry}
        />
      </div>
    </div>
  );
}
