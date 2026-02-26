import { useState, useEffect } from 'react';

// StyleSheet
import styles from './LeaderboardFeed.module.scss';

// Components
import Typography from '@/components/Typography';
import UserListItem from '@/shared/components/UserListItem';
import LoaderIndicator from '@/shared/components/LoaderIndicator';

// Hooks
import { useUserLeaderboard } from '@/shared/hooks/user/useUserLeaderboard';
import { useAuth } from '@/hooks/auth';
import type { User } from '@/shared/hooks/user';

// Icons
import BPointIcon from '@/assets/icons/point-b.svg?react';

// Types
import type { LeaderboardSeason } from '../../index';

interface LeaderboardFeedProps {
  season: LeaderboardSeason;
}

function LeaderboardFeed({ season }: LeaderboardFeedProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [usersBySeasonPage, setUsersBySeasonPage] = useState<
    Record<string, User[]>
  >({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 50;

  const { data: authData } = useAuth();
  const { data, isLoading, isFetching, error, refetch, isPlaceholderData } =
    useUserLeaderboard(currentPage, limit, season);

  // Reset pagination when season changes (but keep cached data)
  useEffect(() => {
    setCurrentPage(1);
    setIsLoadingMore(false);
  }, [season]);

  // Cache key for current season
  const cacheKey = `${season}`;

  // Get cached users for current season
  const allUsers = usersBySeasonPage[cacheKey] || [];

  /**
   * Accumulate users from all pages, cached by season
   * Only update cache when data is fresh (not placeholder from previous query)
   */
  useEffect(() => {
    if (data?.users && !isPlaceholderData) {
      if (currentPage === 1) {
        // First page - replace users for this season
        setUsersBySeasonPage((prev) => ({
          ...prev,
          [cacheKey]: data.users,
        }));
      } else {
        // Subsequent pages - append new users for this season
        setUsersBySeasonPage((prev) => {
          const existingUsers = prev[cacheKey] || [];
          const existingFids = new Set(existingUsers.map((u) => u.fid));
          const newUsers = data.users.filter((u) => !existingFids.has(u.fid));
          return {
            ...prev,
            [cacheKey]: [...existingUsers, ...newUsers],
          };
        });
      }
      setIsLoadingMore(false);
    }
  }, [data, currentPage, cacheKey, isPlaceholderData]);

  /**
   * Handles window scroll for infinite loading.
   * When user scrolls near the bottom, loads the next page automatically.
   */
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const calc = scrollTop + clientHeight + 150; // 150px buffer before bottom

      if (
        calc >= scrollHeight &&
        !isFetching &&
        !isLoadingMore &&
        data?.pagination.hasNextPage
      ) {
        setIsLoadingMore(true);
        setCurrentPage((prev) => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFetching, isLoadingMore, data?.pagination.hasNextPage]);

  // Check if we have data to show
  const hasData = allUsers.length > 0;
  const hasNextPage = data?.pagination.hasNextPage;

  // Show skeleton when fetching first page and no cached data for this season
  const isLoadingFirstPage = (isLoading || isFetching) && currentPage === 1 && !hasData;

  // Skeleton loader for the user rank card (uses actual user avatar)
  const renderUserRankSkeleton = () => (
    <div className={styles.userRankSection}>
      <div className={styles.skeletonUserRankCard}>
        <div className={styles.skeletonUserRankContent}>
          {authData?.photoUrl ? (
            <img
              src={authData.photoUrl}
              alt={authData.username || 'User'}
              className={styles.userRankAvatar}
            />
          ) : (
            <div className={styles.skeletonAvatar} />
          )}
          <div className={styles.skeletonRankDetails}>
            <div className={styles.skeletonPosition} />
            <div className={styles.skeletonPoints} />
          </div>
        </div>
      </div>
    </div>
  );

  // Skeleton loader for user list items
  const renderUserListSkeleton = () => (
    <div className={styles.usersList}>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={`skeleton-${index}`} className={styles.userItem}>
          <div className={styles.skeletonUserItem}>
            <div className={styles.skeletonItemPosition} />
            <div className={styles.skeletonItemAvatar} />
            <div className={styles.skeletonItemUsername} />
            <div className={styles.skeletonItemScore} />
            <div className={styles.skeletonItemIcon} />
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoadingFirstPage) {
    return (
      <div className={styles.layout}>
        {renderUserRankSkeleton()}
        {renderUserListSkeleton()}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.layout}>
        <div className={styles.error}>
          <Typography>Failed to load leaderboard</Typography>
          <button
            onClick={() => {
              setCurrentPage(1);
              setUsersBySeasonPage((prev) => ({ ...prev, [cacheKey]: [] }));
              refetch();
            }}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Updated user rank card design */}
      {data?.currentUser && (
        <div className={styles.userRankSection}>
          <div className={styles.userRankCard}>
            <div className={styles.userRankContent}>
              {/* User avatar and rank */}
              <div className={styles.userRankInfo}>
                {data.currentUser.user?.photoUrl && (
                  <img
                    src={data.currentUser.user.photoUrl}
                    alt={data.currentUser.user.username || 'User'}
                    className={styles.userRankAvatar}
                  />
                )}
                <div className={styles.userRankDetails}>
                  <Typography
                    size={40}
                    weight="bold"
                    className={styles.userRankPosition}
                  >
                    #{data.currentUser.position}
                  </Typography>
                  <div className={styles.userRankPoints}>
                    <Typography size={14} lineHeight={14} className={styles.pointsText}>
                      {data.currentUser.points}
                    </Typography>
                    <BPointIcon width={15} height={12} color="#fff" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className={styles.usersList}>
        {allUsers.map((user, index) => {
          // Calculate actual position based on accumulated index
          const position = index + 1;
          return (
            <div key={`user-${user.fid}`} className={styles.userItem}>
              <UserListItem user={user} position={position} />
            </div>
          );
        })}

        {/* Loading indicator when fetching more */}
        {(isFetching || isLoadingMore) && currentPage > 1 && (
          <div className={styles.loadingMore}>
            <LoaderIndicator size={24} />
            <Typography size={12} className={styles.loadingText}>
              Loading more users...
            </Typography>
          </div>
        )}

        {/* End of list indicator */}
        {!hasNextPage && allUsers.length > 0 && !isLoadingMore && (
          <div className={styles.endOfList}>
            <Typography size={12} className={styles.endText}>
              You've reached the end! 🎉
            </Typography>
            <Typography size={12} className={styles.totalText}>
              Total: {data?.pagination.total || allUsers.length} users
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardFeed;
