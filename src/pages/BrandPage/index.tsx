// Dependencies
import { useNavigate, useParams } from "react-router-dom";

// StyleSheet
import styles from "./BrandPage.module.scss";

// Components
import AppLayout from "@/shared/layouts/AppLayout";
import Typography from "@/components/Typography";
import Button from "@/components/Button";
import LoaderIndicator from "@/components/LoaderIndicator";
import UserProfileGridItem from "@/shared/components/UserProfileGridItem";
import BrandProfileHeader from "@/shared/components/BrandProfileHeader";

// Assets
import FavoriteIcon from "@/assets/icons/favorite-icon.svg?react";

// Hocs
import withProtectionRoute from "@/hocs/withProtectionRoute";

// Hooks
import { useBrand } from "@/hooks/brands";
import { useAuth } from "@/hooks/auth";
import useDisableScrollBody from "@/hooks/ui/useDisableScrollBody";

// Utils
import { shortenNumber } from "@/utils/number";
import sdk from "@farcaster/miniapp-sdk";

function BrandPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { data: user } = useAuth();
  const { data, isLoading } = useBrand(Number(id));
  useDisableScrollBody();

  /**
   * Determines if the footer should be visible based on the user's voting status.
   *
   * @type {boolean} - True if the user has voted today, false otherwise.
   */
  const isFooterVisible = user && !user.hasVotedToday;

  // Get actual fan count from backend response (unique users who voted for this brand)
  const totalFans = data?.fanCount || 0;

  return (
    <AppLayout>
      <div className={styles.body}>
        {isLoading || !data || !data.brand?.name ? (
          <LoaderIndicator variant={"fullscreen"} />
        ) : (
          <>
            {/* New Brand Profile Header */}
            <BrandProfileHeader brand={data.brand} />

            <div className={styles.container}>
              <div className={styles.grid}>
                {/* Fans */}
                <UserProfileGridItem
                  variant="primary"
                  title="FANS"
                  value={shortenNumber(totalFans)}
                  subtext="VOTERS"
                />

                {/* Channel */}
                <UserProfileGridItem title="CHANNEL">
                  <div className={styles.channelContent}>
                    <Typography
                      variant="geist"
                      weight="medium"
                      size={14}
                      lineHeight={16}
                    >
                      <a
                        href={`https://warpcast.com/~/channel/${data.brand.channel?.slice(
                          1
                        )}`}
                        target="_blank"
                        className={styles.channelLink}
                      >
                        {data.brand.channel || "/no-channel"}
                      </a>
                    </Typography>
                  </div>
                </UserProfileGridItem>

                {/* Ranking */}
                <UserProfileGridItem
                  title="RANKING"
                  value={`#${data.brand.currentRanking || "N/A"}`}
                  subtext="GLOBAL"
                />

                {/* Category */}
                {data.brand.category?.id && (
                  <UserProfileGridItem
                    title="CATEGORY"
                    subtext={
                      data.brand.category?.name?.toUpperCase() || "TOKEN"
                    }
                    // value={data.brand.category?.name || "No category"}
                  />
                )}

                {/* Guardian */}
                {data.brand.guardianFid && (
                  <UserProfileGridItem
                    onClick={() => {
                      sdk.actions.viewProfile({ fid: data.brand.guardianFid! });
                    }}
                    variant="primary"
                    title="GUARDIAN"
                  >
                    <div className={styles.guardianContent}>
                      <img
                        src={data.brand.guardianPfp}
                        alt="Guardian"
                        className={styles.guardianAvatar}
                      />
                      <Typography
                        variant="geist"
                        weight="medium"
                        size={12}
                        lineHeight={14}
                      >
                        @{data.brand.guardianHandle}
                      </Typography>
                    </div>
                  </UserProfileGridItem>
                )}

                {/* Ticker */}
                {data.brand.ticker && (
                  <UserProfileGridItem
                    title="TICKER"
                    onClick={() => {
                      sdk.actions.swapToken({
                        sellToken: `eip155:8453/erc20:${data.brand.contractAddress}`,
                        buyToken:
                          "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07",
                        sellAmount: "1000000",
                      });
                    }}
                    value={data.brand.ticker}
                    subtext=""
                  />
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
                      {data.brand.description || "No description available."}
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
                          {data.brand.url.replace(/^https?:\/\//, "")}
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
              caption={"Add To Podium"}
              variant="primary"
              iconLeft={<FavoriteIcon />}
              onClick={() => navigate("/vote")}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default withProtectionRoute(BrandPage, "always");
