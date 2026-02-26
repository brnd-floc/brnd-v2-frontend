import Typography from '@/components/Typography';
import { formatUnits } from 'viem';
import VoteHashIcon from '@/shared/assets/icons/vote-hash.svg';
import ExternalLinkIconShare from '@/shared/assets/icons/external-link-icon-share.svg';
import styles from './AlreadySharedView.module.scss';

interface AlreadySharedStatusProps {
  transactionHash?: string;
  claimAmountWei?: string;
  showReady: boolean;
  claimError?: string | null;
  contractError?: string | null;
}

export function AlreadySharedStatus({
  transactionHash,
  claimAmountWei,
  showReady,
  claimError,
  contractError,
}: AlreadySharedStatusProps) {
  return (
    <>
      <div className={styles.shareMessage}>
        <Typography
          variant={'geist'}
          weight={'medium'}
          size={12}
          lineHeight={16}
          textAlign={'center'}
        >
          Claim your daily $BRND rewards
        </Typography>
      </div>

      <div className={styles.transactionsContainer}>
        {transactionHash && (
          <div className={styles.transactionChip}>
            <div className={styles.transactionHeader}>
              <span className={styles.transactionIcon}>
                <img src={VoteHashIcon} alt="" aria-hidden="true" />
              </span>
              <span className={styles.transactionText}>
                Vote Txn: {transactionHash.slice(0, 6)}...
                {transactionHash.slice(-4)}
              </span>
              <a
                href={`https://basescan.org/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
                title="View on Base Explorer"
              >
                <img src={ExternalLinkIconShare} alt="" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </div>

      {showReady && claimAmountWei && (
        <div className={styles.verificationMessage}>
          <Typography
            variant={'geist'}
            weight={'medium'}
            size={14}
            lineHeight={18}
            textAlign={'center'}
          >
            ✅ Ready to claim{' '}
            {parseFloat(formatUnits(BigInt(claimAmountWei), 18)).toFixed(0)}{' '}
            $BRND
          </Typography>
        </div>
      )}

      {(claimError || contractError) && (
        <div className={styles.errorMessage}>
          <Typography
            variant={'geist'}
            weight={'medium'}
            size={14}
            lineHeight={18}
            textAlign={'center'}
          >
            {claimError || contractError}
          </Typography>
        </div>
      )}
    </>
  );
}
