import Button from '@/components/Button';
import LoaderIndicator from '@/shared/components/LoaderIndicator';
import ShareIcon from '@/assets/icons/share-icon.svg?react';
import styles from './ShareView.module.scss';

type SharePrimaryActionProps = {
  buttonCaption: string;
  isLoading: boolean;
  showShareIcon: boolean;
  disablePrimaryButton: boolean;
  showManualVerifyButton: boolean;
  isVerifying: boolean;
  onPrimaryAction: () => void;
  onManualVerify: () => void;
};

export function SharePrimaryAction({
  buttonCaption,
  isLoading,
  showShareIcon,
  disablePrimaryButton,
  showManualVerifyButton,
  isVerifying,
  onPrimaryAction,
  onManualVerify,
}: SharePrimaryActionProps) {
  if (showManualVerifyButton) {
    return (
      <Button
        caption={isVerifying ? 'Verifying Share' : 'Verify share'}
        onClick={onManualVerify}
        className={styles.button}
        iconLeft={isVerifying ? <LoaderIndicator size={16} /> : undefined}
        disabled={isVerifying}
      />
    );
  }

  return (
    <Button
      caption={buttonCaption}
      className={styles.button}
      iconLeft={
        isLoading ? (
          <LoaderIndicator size={16} />
        ) : showShareIcon ? (
          <ShareIcon />
        ) : undefined
      }
      onClick={onPrimaryAction}
      disabled={disablePrimaryButton}
    />
  );
}
