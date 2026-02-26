// Dependencies
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// StyleSheet
import styles from './BrandPage.module.scss';

// Components
import AppLayout from '@/shared/layouts/AppLayout';
import Typography from '@/components/Typography';
import Button from '@/components/Button';
import LoaderIndicator from '@/components/LoaderIndicator';
import UserProfileGridItem from '@/shared/components/UserProfileGridItem';
import BrandProfileHeader from '@/shared/components/BrandProfileHeader';
import StickyPageHeader from '@/components/StickyPageHeader';

// Assets
import FavoriteIcon from '@/assets/icons/favorite-icon.svg?react';

// Hocs
import withProtectionRoute from '@/hocs/withProtectionRoute';

// Hooks
import { useBrand } from '@/hooks/brands';
import { useAuth } from '@/hooks/auth';

// Utils
import { shortenNumber } from '@/utils/number';
import { RiCheckLine, RiClipboardLine } from 'react-icons/ri';

function BrandPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { data: user } = useAuth();
  const { data, isLoading } = useBrand(Number(id));
  const [isTickerContractCopied, setIsTickerContractCopied] =
    useState<boolean>(false);

  /**
   * Determines if the footer should be visible based on the user's voting status.
   *
   * @type {boolean} - True if the user has voted today, false otherwise.
  */
  const isFooterVisible = user && !user.hasVotedToday;

  // Get actual fan count from backend response (unique users who voted for this brand)
  const totalFans = data?.fanCount || 0;

  useEffect(() => {
    if (!isTickerContractCopied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsTickerContractCopied(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isTickerContractCopied]);

  const handleCopyTickerContract = useCallback(async () => {
    const contractAddress = data?.brand?.contractAddress;
    if (!contractAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(contractAddress);
      setIsTickerContractCopied(true);
    } catch {
      // No-op: clipboard can be unavailable in some embedded contexts.
    }
  }, [data?.brand?.contractAddress]);

  const guardianHandle = data?.brand?.guardianHandle
    ? data.brand.guardianHandle.startsWith('@')
      ? data.brand.guardianHandle
      : `@${data.brand.guardianHandle}`
    : '';
  const guardianFid = data?.brand?.guardianFid ?? data?.brand?.onChainFid;

  return (
    <AppLayout>
      <div className={styles.body}>
        {isLoading || !data || !data.brand?.name ? (
          <div className={styles.loadingContainer}>
            <LoaderIndicator variant={'fullscreen'} />
          </div>
        ) : (
          <>
            <StickyPageHeader paddingY="md">
              <BrandProfileHeader
                brand={data.brand}
                voteTrend7d={data.voteTrend7d}
              />
            </StickyPageHeader>

            <div className={styles.container}>
              <div className={styles.grid}>
                {/* Fans */}
                <UserProfileGridItem
                  variant="primary"
                  title="FANS"
                  value={shortenNumber(totalFans)}
                  subtext="ALL TIME VOTERS"
                />

                {/* Profile or Channel */}
                <UserProfileGridItem
                  title={data.brand.profile ? 'PROFILE' : 'CHANNEL'}
                >
                  <div className={styles.channelContent}>
                    <Typography
                      variant="geist"
                      weight="medium"
                      size={14}
                      lineHeight={16}
                    >
                      {data.brand.profile ? (
                        <a
                          href={`https://warpcast.com/${
                            data.brand.profile.startsWith('@')
                              ? data.brand.profile.slice(1)
                              : data.brand.profile
                          }`}
                          target="_blank"
                          className={styles.channelLink}
                        >
                          {data.brand.profile.startsWith('@')
                            ? data.brand.profile
                            : `@${data.brand.profile}`}
                        </a>
                      ) : (
                        <a
                          href={`https://warpcast.com/~/channel/${data.brand.channel?.slice(
                            1,
                          )}`}
                          target="_blank"
                          className={styles.channelLink}
                        >
                          {data.brand.channel || '/no-channel'}
                        </a>
                      )}
                    </Typography>
                  </div>
                </UserProfileGridItem>

                {/* Ranking */}
                <UserProfileGridItem
                  title="RANKING"
                  value={`#${data.brand.currentRanking || 'N/A'}`}
                  subtext="GLOBAL"
                />

                {/* Category */}
                {data.brand.category?.id && (
                  <UserProfileGridItem
                    title="CATEGORY"
                    subtext={
                      data.brand.category?.name?.toUpperCase() || 'TOKEN'
                    }
                    // value={data.brand.category?.name || "No category"}
                  />
                )}

                {/* Guardian */}
                {guardianFid && (
                  <UserProfileGridItem
                    onClick={() => {
                      window.open(
                        `https://warpcast.com/~/profiles/${guardianFid}`,
                        '_blank',
                      );
                    }}
                    variant="primary"
                    title="GUARDIAN"
                  >
                    <div className={styles.guardianContent}>
                      {data.brand.guardianPfp && (
                        <img
                          src={data.brand.guardianPfp}
                          alt="Guardian"
                          className={styles.guardianAvatar}
                        />
                      )}
                      <Typography
                        variant="geist"
                        weight="medium"
                        size={12}
                        lineHeight={14}
                      >
                        {guardianHandle || `FID ${guardianFid}`}
                      </Typography>
                      {guardianHandle && (
                        <Typography
                          variant="geist"
                          weight="regular"
                          size={11}
                          lineHeight={13}
                        >
                          {`FID ${guardianFid}`}
                        </Typography>
                      )}
                      {!guardianHandle && (
                        <Typography
                          variant="geist"
                          weight="regular"
                          size={11}
                          lineHeight={13}
                        >
                          Tap to view profile
                        </Typography>
                      )}
                    </div>
                  </UserProfileGridItem>
                )}

                {/* Ticker */}
                {(data.brand.ticker || data.brand.contractAddress) && (
                  <UserProfileGridItem
                    title="TICKER"
                    onClick={() => {
                      if (data.brand.contractAddress) {
                        void handleCopyTickerContract();
                      }
                    }}
                  >
                    <div className={styles.tickerContent}>
                      {data.brand.contractAddress && (
                        <button
                          type="button"
                          className={styles.tickerCopyButton}
                          aria-label="Copy ticker contract address"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleCopyTickerContract();
                          }}
                        >
                          {isTickerContractCopied ? (
                            <RiCheckLine />
                          ) : (
                            <RiClipboardLine />
                          )}
                        </button>
                      )}

                      <Typography
                        as="h1"
                        variant="geist"
                        weight="semiBold"
                        size={16}
                        lineHeight={20}
                        className={styles.tickerValue}
                      >
                        {data.brand.ticker || 'NO TICKER'}
                      </Typography>
                    </div>
                  </UserProfileGridItem>
                )}
              </div>

              {/* Description Section */}
              <div className={styles.descriptionSection}>
                <UserProfileGridItem
                  variant="primary"
                  title="DESCRIPTION"
                  className={styles.descriptionCard}
                >
                  <div className={styles.descriptionContent}>
                    <Typography
                      variant="geist"
                      weight="regular"
                      size={14}
                      lineHeight={18}
                      className={styles.descriptionText}
                    >
                      {data.brand.description || 'No description available.'}
                    </Typography>
                    {data.brand.url && (
                      <Typography
                        variant="geist"
                        weight="medium"
                        size={12}
                        lineHeight={14}
                        className={styles.websiteLink}
                      >
                        <a
                          href={data.brand.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {data.brand.url.replace(/^https?:\/\//, '')}
                        </a>
                      </Typography>
                    )}
                  </div>
                </UserProfileGridItem>
              </div>

              {isFooterVisible && <div className={styles.divider} />}
            </div>
          </>
        )}

        {isFooterVisible && (
          <div className={styles.footer}>
            <Button
              caption={'Add To Podium'}
              variant="primary"
              iconLeft={<FavoriteIcon />}
              onClick={() =>
                navigate('/vote', {
                  state: { preselectedBrand: data?.brand },
                })
              }
            />
          </div>
        )}

        {isTickerContractCopied && (
          <div className={styles.copyToast} role="status" aria-live="polite">
            Contract copied
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default withProtectionRoute(BrandPage, 'always');
