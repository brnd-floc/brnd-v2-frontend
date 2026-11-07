import Button from '@/components/Button';

import styles from './ShareView.module.scss';

interface ShareActionsSectionProps {
  isLoading: boolean;
  onSkip: () => void;
  onVerify?: () => void;
  onShareAgain?: () => void;
}

export function ShareActionsSection({ isLoading, onSkip, onVerify, onShareAgain }: ShareActionsSectionProps) {
  return (
    <div className={styles.action}>
      {onVerify && <Button variant="underline" caption="Already shared? Retry verification"
        onClick={onVerify} disabled={isLoading} />}
      {onShareAgain && <Button variant="underline" caption="Share again"
        onClick={onShareAgain} disabled={isLoading} />}
      <Button
        variant={'underline'}
        caption="Skip"
        onClick={onSkip}
        disabled={isLoading}
      />
    </div>
  );
}
