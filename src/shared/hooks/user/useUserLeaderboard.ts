// Dependencies
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// Services
import { getUserLeaderboard, LeaderboardApiResponse } from '@/services/user';

// Types
export type LeaderboardSeason = 'all' | 's1' | 's2';

/**
 * Hook for fetching user leaderboard with pagination and current user position.
 *
 * @param page - Page number for pagination
 * @param limit - Number of users per page
 * @param season - Season filter: "all" for all-time, "s1" for season 1, "s2" for season 2
 */
export const useUserLeaderboard = (
  page: number = 1,
  limit: number = 50,
  season: LeaderboardSeason = 'all'
) => {
  return useQuery({
    queryKey: ['leaderboard', page, limit, season],
    queryFn: () => getUserLeaderboard(page, limit, season),
    // Return to the leaderboard after a vote or claim with fresh server data.
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: page === 1 && season !== 's1' ? 60_000 : false,
    placeholderData: keepPreviousData, // Keep previous data while loading new page
  });
};

// Export the response type for use in components
export type { LeaderboardApiResponse };
