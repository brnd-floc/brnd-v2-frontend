import Podium from '@/components/Podium';

import { SharePrimaryAction } from './SharePrimaryAction';
import { ShareRetryPanel } from './ShareRetryPanel';

import styles from './ShareView.module.scss';
import { Brand } from '@/hooks/brands';

interface SharePodiumSectionProps {
  currentBrands: Brand[];
  buttonCaption: string;
  isLoading: boolean;
  showShareIcon: boolean;
  disablePrimaryButton: boolean;
  showManualVerifyButton: boolean;
  isVerifying: boolean;
  showWalletWarning: boolean;
  rewardRecipient?: `0x${string}`;
  onPrimaryAction: () => void;
  onManualVerify: () => void;
}

export function SharePodiumSection({
  currentBrands,
  buttonCaption,
  isLoading,
  showShareIcon,
  disablePrimaryButton,
  showManualVerifyButton,
  isVerifying,
  showWalletWarning,
  rewardRecipient,
  onPrimaryAction,
  onManualVerify,
}: SharePodiumSectionProps) {
  return (
    <div className={styles.box}>
      <div className={styles.podium}>
        <Podium isAnimated={false} variant={'readonly'} initial={currentBrands} />

        <div className={styles.action}>
          <SharePrimaryAction
            buttonCaption={buttonCaption}
            isLoading={isLoading}
            showShareIcon={showShareIcon}
            disablePrimaryButton={disablePrimaryButton}
            showManualVerifyButton={showManualVerifyButton}
            isVerifying={isVerifying}
            onPrimaryAction={onPrimaryAction}
            onManualVerify={onManualVerify}
          />
        </div>

        <ShareRetryPanel
          showWalletWarning={showWalletWarning}
          rewardRecipient={rewardRecipient}
        />
      </div>
    </div>
  );
}
