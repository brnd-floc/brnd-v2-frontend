import Button from '@/components/Button';

import styles from './ShareView.module.scss';

interface ShareActionsSectionProps {
  isLoading: boolean;
  onSkip: () => void;
}

export function ShareActionsSection({ isLoading, onSkip }: ShareActionsSectionProps) {
  return (
    <div className={styles.action}>
      <Button
        variant={'underline'}
        caption="Skip"
        onClick={onSkip}
        disabled={isLoading}
      />
    </div>
  );
}
