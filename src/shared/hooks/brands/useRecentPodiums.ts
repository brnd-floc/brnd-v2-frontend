// Dependencies
import { useQuery, keepPreviousData } from "@tanstack/react-query";

// Services
import { getRecentPodiums } from "@/services/brands";

/**
 * Hook for fetching recent podiums with pagination
 */
export const useRecentPodiums = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ["recent-podiums", page, limit],
    queryFn: async () => {
      const response = await getRecentPodiums(page, limit);
      // Transform response to match component expectations
      return response;
    },
    staleTime: Infinity, // Never consider data stale - cache indefinitely
    gcTime: Infinity, // Keep cached data indefinitely (formerly cacheTime)
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch when network reconnects
    placeholderData: keepPreviousData, // Keep previous data while loading new page
  });
};
